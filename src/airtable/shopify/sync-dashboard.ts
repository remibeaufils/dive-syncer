import Record from 'airtable/lib/record';
import { addDays, format } from 'date-fns';
import { toDate, utcToZonedTime } from 'date-fns-tz';
import mongo from '../../mongo-connect';

const DEFAULT_MIN_DATE = '2021-01-01';
const AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST = 10;

const getFreshestDateInAirtable = async (base, table) => {
    const records = await base(table)
        .select({
            maxRecords: 1,
            sort: [{ field: 'date', direction: 'desc' }],
        })
        .all();

    return records?.[0]?.get('date');
};

const avoidDuplicate = async (base, table, freshestDateInAirtable) => {
    const records = await base(table)
        .select({
            filterByFormula: `{date} = '${freshestDateInAirtable}'`,
        })
        .all();

    if (!records || !records.length) return;

    const requests: Promise<Record>[] = [];

    for (let i = 0; i < Math.ceil(records.length / AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST); i++) {
        requests.push(
            base(table).destroy(
                records
                    .slice(i * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST, (i + 1) * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST)
                    .map(({ id }) => id),
            ),
        );
    }

    return await Promise.all(requests);
};

const groupByDay = (date: string) => {
    return {
        period_timezone: `$${date}.timezone`,
        period_type: 'day',
        period_start: {
            $dateFromParts: {
                year: {
                    $year: {
                        date: `$${date}.date`,
                        timezone: `$${date}.timezone`,
                    },
                },
                month: {
                    $month: {
                        date: `$${date}.date`,
                        timezone: `$${date}.timezone`,
                    },
                },
                day: {
                    $dayOfMonth: {
                        date: `$${date}.date`,
                        timezone: `$${date}.timezone`,
                    },
                },
                timezone: `$${date}.timezone`,
            },
        },
        period_end: {
            $subtract: [
                {
                    $dateFromParts: {
                        year: {
                            $year: {
                                date: `$${date}.date`,
                                timezone: `$${date}.timezone`,
                            },
                        },
                        month: {
                            $month: {
                                date: `$${date}.date`,
                                timezone: `$${date}.timezone`,
                            },
                        },
                        day: {
                            $add: [
                                {
                                    $dayOfMonth: {
                                        date: `$${date}.date`,
                                        timezone: `$${date}.timezone`,
                                    },
                                },
                                1,
                            ],
                        },
                        timezone: `$${date}.timezone`,
                    },
                },
                1,
            ],
        },
    };
};

const getDataFromMongo = async (store, lastDate, collection, timezone) => {
    try {
        const minDate = toDate(lastDate ? lastDate : DEFAULT_MIN_DATE, { timeZone: timezone });

        const maxDate = addDays(minDate, 1000);

        const results = await mongo.client
            .db(process.env.MONGO_DATABASE)
            .collection(collection)
            .aggregate([
                {
                    $match: {
                        store_id: store.id,
                        'created_at.date': { $gte: minDate, $lt: maxDate },
                        'detail.line_item_refund_discrepancy': { $eq: 0 },
                    },
                },
                {
                    $group: {
                        _id: {
                            store_id: '$store_id',
                            ...groupByDay('created_at'),
                        },
                        turnover: { $sum: '$turnover' },
                        profit: { $sum: '$profit' },
                        order_ids: { $addToSet: '$order_id' },
                    },
                },
                {
                    $project: {
                        _id: 1,
                        year: {
                            $year: {
                                date: `$_id.period_start`,
                                timezone: `$_id.period_timezone`,
                            },
                        },
                        month: {
                            $month: {
                                date: `$_id.period_start`,
                                timezone: `$_id.period_timezone`,
                            },
                        },
                        turnover: 1,
                        profit: 1,
                        orders_count: { $size: '$order_ids' },
                        avg_turnover: {
                            $round: [{ $divide: ['$turnover', { $size: '$order_ids' }] }, 2],
                        },
                        avg_profit: {
                            $round: [{ $divide: ['$profit', { $size: '$order_ids' }] }, 2],
                        },
                    },
                    // year, month
                },
                { $sort: { '_id.period_start': 1 } },
            ])
            .toArray();

        return results;
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error);

        return null;
    }
};

const formatData = (rows) =>
    rows.map(({ _id, avg_profit, avg_turnover, month, orders_count, profit, turnover, year }) => {
        const a = {
            fields: {
                date: format(utcToZonedTime(_id.period_start, _id.period_timezone), 'yyyy-MM-dd'),
                year,
                month,
                turnover,
                profit,
                orders_count,
                avg_turnover,
                avg_profit,
            },
        };
        return a;
    });

export default async (table, collection, store, base, timezone) => {
    console.log('[Airtable Shopify] - Sync dashboard init - begin');

    try {
        const freshestDateInAirtable = await getFreshestDateInAirtable(base, table);

        await avoidDuplicate(base, table, freshestDateInAirtable);

        const data = await getDataFromMongo(store, freshestDateInAirtable, collection, timezone);

        if (!data) return;

        const formattedData = formatData(data);

        const requests: Promise<Record>[] = [];

        for (let i = 0; i < Math.ceil(formattedData.length / AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST); i++) {
            requests.push(
                base(table).create(
                    formattedData.slice(
                        i * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
                        (i + 1) * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
                    ),
                ),
            );
        }

        // Deduce if have to create or update record.

        // const creates: any[] = [];
        // const updates: any[] = [];

        // await Promise.all(
        //     formattedData.map(async (data) => {
        //         const records = await base(table)
        //             .select({
        //                 // view: 'All products',
        //                 maxRecords: 1,
        //                 fields: ['product_id', 'variant_id'],
        //                 filterByFormula: `AND({product_id} = '${data.fields.product_id}', {variant_id} = '${data.fields.variant_id}')`,
        //             })
        //             .all();

        //         if (records && records.length)
        //             updates.push({
        //                 id: records[0].id,
        //                 ...data,
        //             });
        //         else creates.push(data);
        //     }),
        // );

        // // For each udpates, push batch of 10 into records.

        // for (let i = 0; i < Math.ceil(creates.length / AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST); i++) {
        //     requests.push(
        //         base(table).create(
        //             creates.slice(
        //                 i * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
        //                 (i + 1) * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
        //             ),
        //         ),
        //     );
        // }

        // // For each creates, push batch of 10 into records.

        // for (let i = 0; i < Math.ceil(updates.length / AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST); i++) {
        //     requests.push(
        //         base(table).update(
        //             updates.slice(
        //                 i * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
        //                 (i + 1) * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
        //             ),
        //         ),
        //     );
        // }

        console.log('[Airtable Shopify] - Sync dashboard init - sync airtable');

        await Promise.all(requests);
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error);
    } finally {
        console.log('[Airtable Shopify] - Sync dashboard init - end');
    }
};
