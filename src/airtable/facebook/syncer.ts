import Airtable from 'airtable';
import Record from 'airtable/lib/record';
import { format } from 'date-fns';
import { toDate, utcToZonedTime } from 'date-fns-tz';
import addDays from 'date-fns/addDays';
import mongo from '../../mongo-connect';

const COLLECTION = 'facebook';
const DEFAULT_MIN_DATE = '2021-01-01';
const AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST = 10;

const getFreshestDateInAirtable = async (base, level_table) => {
    const records = await base(level_table)
        .select({
            maxRecords: 1,
            sort: [{ field: 'since', direction: 'desc' }],
        })
        .all();

    return records?.[0]?.get('since');
};

const getDataFromMongo = async (store, lastDate, level, timezone) => {
    try {
        let minDate = toDate(DEFAULT_MIN_DATE, { timeZone: timezone });

        if (lastDate) {
            minDate = toDate(lastDate, { timeZone: timezone });
            minDate = addDays(minDate, 1);
        }

        // const results = await mongo.client
        //     .db(process.env.MONGO_DATABASE)
        //     .collection(COLLECTION)
        //     .find({ store_id: store.id, level, 'since.date': { $gte: minDate } })
        //     .toArray();

        const results = await mongo.client
            .db(process.env.MONGO_DATABASE)
            .collection(COLLECTION)
            .aggregate([
                {
                    $match: {
                        store_id: store.id,
                        level,
                        'since.date': { $gte: minDate },
                    },
                },
                {
                    $group: {
                        _id: {
                            store_id: '$store_id',
                            campaign_id: '$campaign_id',
                            campaign_name: '$campaign_name',
                            campaign_type: '$campaign_type',
                            adset_id: '$adset_id',
                            adset_name: '$adset_name',
                            ad_id: '$ad_id',
                            ad_name: '$ad_name',
                            ad_link: '$ad_link',
                            level: '$level',
                            since: '$since',
                            until: '$until',
                            // since_date: '$since.date',
                            // until_date: '$until.date',
                        },
                        clicks: { $sum: '$clicks' },
                        impressions: { $sum: '$impressions' },
                        spend: { $sum: '$spend' },
                        purchase_count: { $sum: '$purchase_count' },
                        purchase_count_1d_view: { $sum: '$purchase_count_1d_view' },
                        purchase_count_28d_click: { $sum: '$purchase_count_28d_click' },
                        purchase_count_7d_click: { $sum: '$purchase_count_7d_click' },
                        purchase_value: { $sum: '$purchase_value' },
                        purchase_value_1d_view: { $sum: '$purchase_value_1d_view' },
                        purchase_value_28d_click: { $sum: '$purchase_value_28d_click' },
                        purchase_value_7d_click: { $sum: '$purchase_value_7d_click' },
                    },
                },
                {
                    $addFields: {
                        cpa: {
                            $cond: {
                                if: { $ne: ['$purchase_count', 0] },
                                then: { $divide: ['$spend', '$purchase_count'] },
                                else: null,
                            },
                        },
                        cpm: {
                            $cond: {
                                if: { $ne: ['$impressions', 0] },
                                then: {
                                    $multiply: [1000, { $divide: [{ $sum: '$spend' }, '$impressions'] }],
                                },
                                else: null,
                            },
                        },
                        ctr: {
                            $cond: {
                                if: { $ne: ['$impressions', 0] },
                                then: {
                                    $multiply: [100, { $divide: ['$clicks', '$impressions'] }],
                                },
                                else: null,
                            },
                        },
                        roas: {
                            $cond: {
                                if: { $ne: ['$spend', 0] },
                                then: { $divide: ['$purchase_value', '$spend'] },
                                else: null,
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        store_id: '$_id.store_id',
                        campaign_id: '$_id.campaign_id',
                        campaign_name: '$_id.campaign_name',
                        campaign_type: '$_id.campaign_type',
                        adset_id: '$_id.adset_id',
                        adset_name: '$_id.adset_name',
                        ad_id: '$_id.ad_id',
                        ad_name: '$_id.ad_name',
                        ad_link: '$_id.ad_link',
                        level: '$_id.level',
                        since: '$_id.since',
                        until: '$_id.until',
                        clicks: 1,
                        impressions: 1,
                        spend: 1,
                        purchase_count: 1,
                        purchase_count_1d_view: 1,
                        purchase_count_28d_click: 1,
                        purchase_count_7d_click: 1,
                        purchase_value: 1,
                        purchase_value_1d_view: 1,
                        purchase_value_28d_click: 1,
                        purchase_value_7d_click: 1,
                        cpa: 1,
                        cpm: 1,
                        ctr: 1,
                        roas: 1,
                    },
                },
            ])
            .toArray();

        return results;
    } catch (error) {
        return null;
    }
};

const formatData = (rows) =>
    rows.map(
        ({
            since,
            until,
            spend,
            purchase_count,
            purchase_count_1d_view,
            purchase_count_28d_click,
            purchase_count_7d_click,
            purchase_value,
            purchase_value_1d_view,
            purchase_value_28d_click,
            purchase_value_7d_click,
            cpm,
            ctr,
            roas,
            cpa,
            campaign_name,
            campaign_type,
            adset_name,
            ad_name,
            impressions,
            clicks,
        }) => ({
            fields: {
                since: format(utcToZonedTime(since.date, since.timezone), 'yyyy-MM-dd'),
                until: format(utcToZonedTime(until.date, until.timezone), 'yyyy-MM-dd'),
                spend,
                purchase_count,
                purchase_count_1d_view,
                purchase_count_28d_click,
                purchase_count_7d_click,
                purchase_value,
                purchase_value_1d_view,
                purchase_value_28d_click,
                purchase_value_7d_click,
                cpm,
                ctr,
                roas,
                cpa,
                campaign_name,
                campaign_type,
                adset_name,
                ad_name,
                impressions,
                clicks,
            },
        }),
    );

export default async (store, api_key, { id: base_id, timezone_name: timezone }) => {
    if (!api_key || !base_id) return null;

    const base = new Airtable({ apiKey: api_key }).base(base_id);

    if (store.id === 'asphalte') {
        await launchingCampaign(store, base, timezone);
    }

    const levels = ['campaign', 'adset'];

    if (!['asphalte', 'mercihandy'].includes(store.id)) {
        levels.push('ad');
    }

    const level_table = {
        campaign: 'Campaigns',
        adset: 'AdSets',
        ad: 'Ads',
    };

    return await Promise.all(levels.map((level) => syncLevel(level, level_table[level], store, base, timezone)));
};

const launchingCampaign = async (store, base, timezone) => {
    try {
        const rows = await mongo.client
            .db(process.env.MONGO_DATABASE)
            .collection(COLLECTION)
            .aggregate([
                {
                    $match: {
                        store_id: store.id,
                        level: 'adset',
                        campaign_name: { $in: [/PRECO/i, /TEASING/i] },
                    },
                },
                {
                    $group: {
                        _id: {
                            campaign_name: '$campaign_name',
                            adset_name: '$adset_name',
                            publisher_platform: '$publisher_platform',
                        },
                        spend: { $sum: '$spend' },
                        impressions: { $sum: '$impressions' },
                        clicks: { $sum: '$clicks' },
                        purchase_count: { $sum: '$purchase_count' },
                        purchase_value: { $sum: '$purchase_value' },
                    },
                },
            ])
            .toArray();

        const results: any[] = [];

        rows.forEach(({ _id: { campaign_name, adset_name, publisher_platform }, spend, purchase_value }) => {
            const row_name = campaign_name.split('//')[0].trim();

            const row_country =
                adset_name.match(/^fr /i) ||
                adset_name.match(/ fr /i) ||
                adset_name.match(/ fr$/i) ||
                adset_name.match(/^france /i) ||
                adset_name.match(/ france /i) ||
                adset_name.match(/ france$/i)
                    ? 'fr'
                    : 'inter';

            const row_type = adset_name.match(/ACTIVATION/i)
                ? 'activation'
                : adset_name.match(/ACQUISITION/i)
                ? 'acquisition'
                : adset_name.match(/RETENTION/i)
                ? 'retention'
                : '?';

            let result: any = results.find(
                ({ campaign, country }) => campaign === campaign_name && country === row_country,
            );

            if (!result) {
                result = {
                    spending: 0,
                    purchase_value: 0,

                    activation_spending: 0,
                    activation_purchase_value: 0,
                    activation__facebook_spending: 0,
                    activation__facebook_purchase_value: 0,
                    activation__instagram_spending: 0,
                    activation__instagram_purchase_value: 0,

                    acquisition_spending: 0,
                    acquisition_purchase_value: 0,
                    acquisition__facebook_spending: 0,
                    acquisition__facebook_purchase_value: 0,
                    acquisition__instagram_spending: 0,
                    acquisition__instagram_purchase_value: 0,

                    retention_spending: 0,
                    retention_purchase_value: 0,
                    retention__facebook_spending: 0,
                    retention__facebook_purchase_value: 0,
                    retention__instagram_spending: 0,
                    retention__instagram_purchase_value: 0,
                };
                results.push(result);
            }

            result.campaign = campaign_name;

            result.name = row_name;
            result.country = row_country;

            result.spending += spend;
            result.purchase_value += purchase_value;
            result.roas = result.purchase_value / result.spending;

            if (row_type === 'activation') {
                result.activation_spending += spend;
                result.activation_purchase_value += purchase_value;
                result.activation_roas = result.activation_purchase_value / result.activation_spending;

                if (publisher_platform === 'facebook') {
                    result.activation__facebook_spending += spend;
                    result.activation__facebook_purchase_value += purchase_value;
                    result.activation__facebook_roas =
                        result.activation__facebook_purchase_value / result.activation__facebook_spending;
                } else if (publisher_platform === 'instagram') {
                    result.activation__instagram_spending += spend;
                    result.activation__instagram_purchase_value += purchase_value;
                    result.activation__instagram_roas =
                        result.activation__instagram_purchase_value / result.activation__instagram_spending;
                }
            } else if (row_type === 'acquisition') {
                result.acquisition_spending += spend;
                result.acquisition_purchase_value += purchase_value;
                result.acquisition_roas = result.acquisition_purchase_value / result.acquisition_spending;

                if (publisher_platform === 'facebook') {
                    result.acquisition__facebook_spending += spend;
                    result.acquisition__facebook_purchase_value += purchase_value;
                    result.acquisition__facebook_roas =
                        result.acquisition__facebook_purchase_value / result.acquisition__facebook_spending;
                } else if (publisher_platform === 'instagram') {
                    result.acquisition__instagram_spending += spend;
                    result.acquisition__instagram_purchase_value += purchase_value;
                    result.acquisition__instagram_roas =
                        result.acquisition__instagram_purchase_value / result.acquisition__instagram_spending;
                }
            } else if (row_type === 'retention') {
                result.retention_spending += spend;
                result.retention_purchase_value += purchase_value;
                result.retention_roas = result.retention_purchase_value / result.retention_spending;

                if (publisher_platform === 'facebook') {
                    result.retention__facebook_spending += spend;
                    result.retention__facebook_purchase_value += purchase_value;
                    result.retention__facebook_roas =
                        result.retention__facebook_purchase_value / result.retention__facebook_spending;
                } else if (publisher_platform === 'instagram') {
                    result.retention__instagram_spending += spend;
                    result.retention__instagram_purchase_value += purchase_value;
                    result.retention__instagram_roas =
                        result.retention__instagram_purchase_value / result.retention__instagram_spending;
                }
            }
        });

        const requests: Promise<Record>[] = [];
        const creates: any[] = [];
        const updates: any[] = [];
        const table = 'Launching Campaign';

        await Promise.all(
            results.map(
                async ({
                    campaign,
                    name,
                    country,

                    spending,
                    roas,

                    activation_spending,
                    activation_roas,
                    activation__facebook_spending,
                    activation__facebook_roas,
                    activation__instagram_spending,
                    activation__instagram_roas,

                    acquisition_spending,
                    acquisition_roas,
                    acquisition__facebook_spending,
                    acquisition__facebook_roas,
                    acquisition__instagram_spending,
                    acquisition__instagram_roas,

                    retention_spending,
                    retention_roas,
                    retention__facebook_spending,
                    retention__facebook_roas,
                    retention__instagram_spending,
                    retention__instagram_roas,
                }) => {
                    // select in airtable

                    const records = await base(table)
                        .select({
                            filterByFormula: `AND({campaign} = "${campaign}", {country} = "${country}")`,
                        })
                        .all();

                    const fields = {
                        campaign,
                        name,
                        country,

                        spending,
                        roas,

                        activation_spending,
                        activation_roas,
                        activation__facebook_spending,
                        activation__facebook_roas,
                        activation__instagram_spending,
                        activation__instagram_roas,

                        acquisition_spending,
                        acquisition_roas,
                        acquisition__facebook_spending,
                        acquisition__facebook_roas,
                        acquisition__instagram_spending,
                        acquisition__instagram_roas,

                        retention_spending,
                        retention_roas,
                        retention__facebook_spending,
                        retention__facebook_roas,
                        retention__instagram_spending,
                        retention__instagram_roas,
                    };

                    // found => update
                    // not found => insert
                    if (records?.length)
                        updates.push({
                            id: records[0].id,
                            fields,
                        });
                    else
                        creates.push({
                            fields,
                        });

                    return;
                },
            ),
        );

        for (let i = 0; i < Math.ceil(creates.length / AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST); i++) {
            requests.push(
                base(table).create(
                    creates.slice(
                        i * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
                        (i + 1) * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
                    ),
                ),
            );
        }

        for (let i = 0; i < Math.ceil(updates.length / AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST); i++) {
            requests.push(
                base(table).update(
                    updates.slice(
                        i * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
                        (i + 1) * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
                    ),
                ),
            );
        }

        await Promise.all(requests);
    } catch (error) {
        console.log(error);
    }
};

const syncLevel = async (level, level_table, store, base, timezone) => {
    try {
        const freshestDateInAirtable = await getFreshestDateInAirtable(base, level_table);
        const data = await getDataFromMongo(store, freshestDateInAirtable, level, timezone);
        if (!data) return;
        const formattedData = formatData(data);

        const requests: Promise<Record>[] = [];

        for (let i = 0; i < Math.ceil(formattedData.length / AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST); i++) {
            requests.push(
                base(level_table).create(
                    formattedData.slice(
                        i * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
                        (i + 1) * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
                    ),
                ),
            );
        }
        await Promise.all(requests);
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error.message);
    } finally {
        console.log('[syncLevel] end', level);
    }
};
