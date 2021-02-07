import { getInsights } from './api/rest-api';
import mongo from '../mongo-connect';
import { isSameDay, addDays, format, subDays } from 'date-fns';
import { toDate, utcToZonedTime } from 'date-fns-tz';

const COLLECTION = 'facebook';
// db.getCollection('facebook').createIndex({ ...: 1 })

export default async (store, facebook) => {
    const timezone = facebook.timezone_name;

    // const short_access_token = 'EAALg7H7pbpgBAGx3TgQaRhSfTMMl0M99YewxT1CdqpzIK8FWpfQAvCj3S9jDZBAZCNZC9bTMLExcpSZBqniI1y5s2ezSifoYYyo5WNpMYF2CglwCZAGtlqKB2vUIi8gHsHoItxRtqyl7QRvueZAkNU4YIcbW3Xy9p0TibRSsPJyZBa0qIIZBZBiqBUXqG8OerB9wgKmSKdEaOxwZDZD';
    // const long_live_access_token = await getLonglivedAccessToken(short_access_token);
    // const access_token = long_live_access_token;
    // const access_token = facebook.access_token;

    // TODO https://developers.facebook.com/docs/graph-api/using-graph-api/#paging

    try {
        while (true) {
            const results = await mongo.client
                .db(process.env.MONGO_DATABASE)
                .collection(COLLECTION)
                .find({ store_id: store.id })
                .project({ date_start: 1 })
                .sort({ 'date_start.date': -1 })
                .limit(1)
                .toArray();

            // Facebook API expects dates param with yyyy-MM-dd format,
            // and then applies the timezone configured in the ad account.
            // So if the ad account timezone is CET, and the last day we retrieved data is 2021-01-27T23:00:00Z, we want to obtain data from next day => 2021-01-28T23:00:00Z => 2021-01-29T00:00:00 CET => time_range.since param has to be 2021-01-29.

            const date_start = !results.length
                ? toDate('2016-01-01', { timeZone: timezone }) // When the store opened.
                : utcToZonedTime(addDays(results[0].date_start.date, 1), results[0].date_start.timezone);
            // Date in server timezone.
            const now = new Date();

            // Convert into add account timezone.
            const TODAY = utcToZonedTime(now, timezone);

            if (isSameDay(date_start, TODAY)) {
                console.log('[Facebook] everything already retrieved.');
                return;
            }

            const since = format(date_start, 'yyyy-MM-dd');

            const YESTERDAY = format(subDays(TODAY, 1), 'yyyy-MM-dd');

            const params = {
                fields: 'spend,actions,action_values',
                time_range: `{"since":"${since}","until":"${YESTERDAY}"}`,
                time_increment: 1,
                //breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
                limit: 3660,
            };

            console.log('[Facebook] insights between: %s.', params.time_range);

            const insights = await getInsights(facebook, params);

            console.log('[Facebook] insights retrieved: %d.', insights.data?.length);

            if (!insights || !insights.data) {
                return;
            }

            console.log('[Facebook] writing %d operations.', insights.data.length);

            const { upsertedCount, modifiedCount } = await mongo.client
                .db(process.env.MONGO_DATABASE)
                .collection(COLLECTION)
                .bulkWrite(
                    insights.data.map((row) => {
                        const purchasesCount = row.actions
                            ? row.actions.find(({ action_type }) => action_type === 'omni_purchase')
                            : null;

                        const purchasesValue = row.action_values
                            ? row.action_values.find(({ action_type }) => action_type === 'omni_purchase')
                            : null;

                        const newRow = {
                            ...row,
                            purchases_count: purchasesCount && purchasesCount.value ? `${purchasesCount.value}` : null,
                            purchases_value: purchasesValue && purchasesValue.value ? `${purchasesValue.value}` : null,
                            // cpa: row.spend && purchaseCount
                            //   ? `${+row.spend / +purchaseCount.value}`
                            //   : null,
                            // roas: row.spend && purchaseValue
                            //   ? `${(purchaseValue.value || 0) / +row.spend}`
                            //   : null,
                            date_start: {
                                date: toDate(row.date_start, { timeZone: timezone }),
                                timezone: timezone,
                            },
                            date_stop: {
                                date: toDate(row.date_stop, { timeZone: timezone }),
                                timezone: timezone,
                            },
                        };

                        delete newRow.actions;
                        delete newRow.action_values;

                        return {
                            updateOne: {
                                filter: {
                                    store_id: store.id,
                                    'date_start.date': newRow.date_start.date,
                                    'date_stop.date': newRow.date_stop.date,
                                },
                                update: { $set: { ...newRow, store_id: store.id } },
                                upsert: true,
                            },
                        };
                    }),
                );

            console.log('[Facebook] rows upserted/updated: %d/%d.', upsertedCount, modifiedCount);

            return;
        }
    } catch (error) {
        console.log('\x1b[31m[Facebook] insights ERROR: %s\x1b[0m', error);
    } finally {
        console.log('[Facebook] end');
    }
};
