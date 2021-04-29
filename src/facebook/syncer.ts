import { getInsights } from './api/rest-api';
import mongo from '../mongo-connect';
import { isSameDay, addDays, format, isAfter, subDays } from 'date-fns';
import { toDate, utcToZonedTime } from 'date-fns-tz';

const COLLECTION = 'facebook';
// db.getCollection('facebook').createIndex({ ...: 1 })

export default async (store, facebook) => {
    const levels = ['campaign', 'adset', 'ad'];

    return await Promise.all(levels.map((level) => syncLevel(store, facebook, level)));
};

const buildParams = (level, since, until) => {
    const sinceF = format(since, 'yyyy-MM-dd');
    const untilF = format(until, 'yyyy-MM-dd');

    const result: any = {
        level,
        time_range: `{"since":"${sinceF}","until":"${untilF}"}`,
        action_attribution_windows: '["1d_view","7d_view","28d_view","1d_click","7d_click","28d_click"]',
        time_increment: 1,
        breakdowns: 'publisher_platform',
    };

    if (level === 'ad') {
        result.limit = 50;
        // When level = adset or ad, I don't want the fields 'purchase_roas' and 'cost_per_action_type' because the request explodes.
        result.fields =
            'impressions,clicks,spend,actions,action_values,cpm,ctr,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name';
    } else if (level === 'adset') {
        result.limit = 200;
        result.fields =
            'impressions,clicks,spend,actions,action_values,cpm,ctr,campaign_id,campaign_name,adset_id,adset_name';
    } else if (level === 'campaign') {
        result.limit = 1000;
        result.fields =
            'impressions,clicks,spend,actions,action_values,cpm,ctr,purchase_roas,cost_per_action_type,campaign_id,campaign_name';
    } else {
        throw new Error(`[Facebook] Level ${level} not configured.`);
    }

    return result;
};

const syncLevel = async (store, facebook, level) => {
    const timezone = facebook.timezone_name;

    // const short_access_token = '';
    // const long_live_access_token = await getLonglivedAccessToken(short_access_token);

    // TODO https://developers.facebook.com/docs/graph-api/using-graph-api/#paging

    try {
        while (true) {
            const results = await mongo.client
                .db(process.env.MONGO_DATABASE)
                .collection(COLLECTION)
                .find({ store_id: store.id, level })
                .project({ since: 1 })
                .sort({ 'since.date': -1 })
                .limit(1)
                .toArray();

            // Facebook API expects dates param with yyyy-MM-dd format,
            // and then applies the timezone configured in the ad account.
            // So if the ad account timezone is CET, and the last day we retrieved data is 2021-01-27T23:00:00Z, we want to obtain data from next day => 2021-01-28T23:00:00Z => 2021-01-29T00:00:00 CET => time_range.since param has to be 2021-01-29.

            const since = !results.length
                ? toDate('2021-01-01', { timeZone: timezone }) // Default since.
                : utcToZonedTime(addDays(results[0].since.date, 1), results[0].since.timezone);

            // Date in server timezone.
            const now = new Date();

            // Convert into add account timezone.
            const TODAY = utcToZonedTime(now, timezone);

            if (isSameDay(since, TODAY)) {
                console.log('[Facebook] everything already retrieved.');
                return;
            }

            let until = addDays(since, 1);

            const YESTERDAY = subDays(TODAY, 1);
            if (isAfter(until, YESTERDAY)) until = YESTERDAY;

            const params = buildParams(level, since, until);

            console.log('[Facebook] insights: %s.', params.level, params.time_range);

            let next;

            while (true) {
                const insights = await getInsights(
                    facebook,
                    params,
                    // level,
                    // since.toISOString().slice(0, 10),
                    // until.toISOString().slice(0, 10),
                    next,
                );

                console.log('[Facebook] insights retrieved: ', insights.data?.length);

                if (!insights || !insights.data) return;

                console.log('[Facebook] writing operations.');

                const { upsertedCount, modifiedCount } = await mongo.client
                    .db(process.env.MONGO_DATABASE)
                    .collection(COLLECTION)
                    .bulkWrite(
                        insights.data.map(
                            ({
                                impressions,
                                clicks,
                                actions,
                                action_values,
                                date_start,
                                date_stop,
                                campaign_id,
                                campaign_name,
                                adset_id,
                                adset_name,
                                ad_id,
                                ad_name,
                                spend,
                                cpm,
                                ctr,
                                purchase_roas,
                                cost_per_action_type,
                                publisher_platform,
                            }) => {
                                const purchasesCount = actions
                                    ? actions.find(({ action_type }) => action_type === 'omni_purchase')
                                    : null;

                                const purchasesCountDefault = purchasesCount?.value ? +purchasesCount.value : null;
                                const purchasesCount28dClick = purchasesCount?.['28d_click']
                                    ? +purchasesCount?.['28d_click']
                                    : null;
                                const purchasesCount7dClick = purchasesCount?.['7d_click']
                                    ? +purchasesCount?.['7d_click']
                                    : null;
                                const purchasesCount1dView = purchasesCount?.['1d_view']
                                    ? +purchasesCount?.['1d_view']
                                    : null;

                                const purchasesValue = action_values
                                    ? action_values.find(({ action_type }) => action_type === 'omni_purchase')
                                    : null;
                                const purchasesValueDefault = purchasesValue?.value ? +purchasesValue?.value : null;
                                const purchasesValue28dClick = purchasesValue?.['28d_click']
                                    ? +purchasesValue?.['28d_click']
                                    : null;
                                const purchasesValue7dClick = purchasesValue?.['7d_click']
                                    ? +purchasesValue?.['7d_click']
                                    : null;
                                const purchasesValue1dView = purchasesValue?.['1d_view']
                                    ? +purchasesValue?.['1d_view']
                                    : null;

                                let purchasesCost = cost_per_action_type
                                    ? cost_per_action_type.find(({ action_type }) => action_type === 'omni_purchase')
                                    : null;
                                purchasesCost = purchasesCost?.value ? +purchasesCost.value : null;

                                // Either the request gives me the cpa, either I calculate it.
                                const cpa = purchasesCost
                                    ? purchasesCost
                                    : purchasesCountDefault && spend
                                    ? +spend / purchasesCountDefault
                                    : null;

                                // Either the request gives me the roas, either I calculate it.
                                const roas =
                                    purchase_roas && purchase_roas[0]
                                        ? +purchase_roas[0].value
                                        : purchasesValueDefault && spend
                                        ? purchasesValueDefault / +spend
                                        : null;

                                const campaignName = campaign_name.toLowerCase();

                                const link = null;
                                // let link = ad_links[ad_id];

                                // if (!link) {
                                // const ad = await getAdCreative(facebook, ad_id);
                                // const link = ad?.object_story_spec?.link_data?.link
                                // || ad?.object_story_spec?.video_data?.call_to_action?.value?.link;
                                // }

                                let newRow: any = {
                                    // website: facebook.website,
                                    // since: date_start,
                                    level,
                                    since: {
                                        date: toDate(date_start, { timeZone: timezone }),
                                        timezone: timezone,
                                    },
                                    // until: date_stop,
                                    until: {
                                        date: toDate(date_stop, { timeZone: timezone }),
                                        timezone: timezone,
                                    },
                                    publisher_platform,
                                    campaign_id,
                                    campaign_name,
                                    impressions: +impressions,
                                    clicks: +clicks,
                                    spend: +spend,
                                    purchase_count: purchasesCountDefault,
                                    purchase_count_28d_click: purchasesCount28dClick,
                                    purchase_count_7d_click: purchasesCount7dClick,
                                    purchase_count_1d_view: purchasesCount1dView,
                                    purchase_value: purchasesValueDefault,
                                    purchase_value_28d_click: purchasesValue28dClick,
                                    purchase_value_7d_click: purchasesValue7dClick,
                                    purchase_value_1d_view: purchasesValue1dView,
                                    cpm: +cpm, // 1000* spend/impressions
                                    ctr: +ctr, // 100* clicks/impressions
                                    cpa, // spend/actions.omni_purchase
                                    roas, // action_values.omni_purchase/spend
                                    campaign_type:
                                        campaignName.includes('acquisition') || campaignName.includes('acquiz')
                                            ? 'ACQUIZ'
                                            : campaignName.includes('remarketing') || campaignName.includes('rmkt')
                                            ? 'RMKT'
                                            : null,
                                };

                                let filter: any = {
                                    store_id: store.id,
                                    level,
                                    publisher_platform,
                                    campaign_id,
                                    'since.date': newRow.since.date,
                                    'until.date': newRow.until.date,
                                };

                                if (['adset', 'ad'].includes(level)) {
                                    newRow = {
                                        ...newRow,
                                        adset_id,
                                        adset_name,
                                    };
                                    filter = {
                                        ...filter,
                                        adset_id,
                                    };
                                }

                                if (level === 'ad') {
                                    newRow = {
                                        ...newRow,
                                        ad_id,
                                        ad_name,
                                        ad_link: link,
                                    };
                                    filter = {
                                        ...filter,
                                        ad_id,
                                    };
                                }

                                return {
                                    updateOne: {
                                        filter,
                                        update: { $set: { ...newRow, store_id: store.id } },
                                        upsert: true,
                                    },
                                };
                            },
                        ),
                    );

                console.log('[Facebook] rows upserted/updated: %d/%d.', upsertedCount, modifiedCount);

                next = insights?.paging?.next;

                if (!next) break;
            }
        }
    } catch (error) {
        console.log('\x1b[31m[Facebook] insights ERROR: %s\x1b[0m', error);
    } finally {
        console.log('[Facebook] end');
    }
};
