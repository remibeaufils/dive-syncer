import Airtable from 'airtable';
import Record from 'airtable/lib/record';
import { format } from 'date-fns';
import { toDate, utcToZonedTime } from 'date-fns-tz';
import addDays from 'date-fns/addDays';
import mongo from '../../mongo-connect';

const COLLECTION = 'google-analytics';
const DEFAULT_MIN_DATE = '2021-01-01';
const AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST = 10;

const getFreshestDateInAirtable = async (base, level_table) => {
    const records = await base(level_table)
        .select({
            maxRecords: 1,
            sort: [{ field: 'date', direction: 'desc' }],
        })
        .all();

    return records?.[0]?.get('date');
};

const getDataFromMongo = async (store, lastDate, level, timezone) => {
    try {
        let minDate = toDate(DEFAULT_MIN_DATE, { timeZone: timezone });

        if (lastDate) {
            minDate = toDate(lastDate, { timeZone: timezone });
            minDate = addDays(minDate, 1);
        }

        const results = await mongo.client
            .db(process.env.MONGO_DATABASE)
            .collection(COLLECTION)
            .find({ store_id: store.id, level, 'ga:date.date': { $gte: minDate } })
            .toArray();

        return results;
    } catch (error) {
        return null;
    }
};

const formatData = (rows) =>
    rows.map((row) => ({
        fields: {
            date: format(utcToZonedTime(row['ga:date'].date, row['ga:date'].timezone), 'yyyy-MM-dd'),
            spend: +row['ga:adCost'],
            purchase_count: +row['ga:transactions'],
            purchase_value: +row['ga:transactionRevenue'],
            cpm: +row['ga:CPM'],
            ctr: +row['ga:CTR'],
            roas: +row['ga:ROAS'],
            cpa: +row['ga:costPerTransaction'],
            campaign_name: row['ga:campaign'],
            adgroup_name: row['ga:adGroup'],
            campaign_type:
                row['ga:campaign'].toLowerCase().includes('acquisition') ||
                row['ga:campaign'].toLowerCase().includes('acquiz')
                    ? 'ACQUIZ'
                    : row['ga:campaign'].toLowerCase().includes('remarketing') ||
                      row['ga:campaign'].toLowerCase().includes('rmkt')
                    ? 'RMKT'
                    : null,
            impressions: +row['ga:impressions'],
            clicks: +row['ga:adClicks'],
        },
    }));

export default async (store, api_key, { id: base_id, timezone }) => {
    if (!api_key || !base_id) return null;

    const base = new Airtable({ apiKey: api_key }).base(base_id);

    const levels = ['campaign', 'adgroup'];

    const level_table = {
        campaign: 'Campaigns',
        adgroup: 'AdGroups',
    };

    return await Promise.all(levels.map((level) => syncLevel(level, level_table[level], store, base, timezone)));
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
        console.log('[end]');
    }
};
