import Record from 'airtable/lib/record';
import { toDate } from 'date-fns-tz';
import mongo from '../../mongo-connect';

const DEFAULT_MIN_DATE = '2021-01-01';
const AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST = 10;

const getFreshestDateInAirtable = async (base, table) => {
    const records = await base(table)
        .select({
            maxRecords: 1,
            sort: [{ field: 'order_created_at', direction: 'desc' }],
        })
        .all();

    return records?.[0]?.get('order_created_at');
};

const avoidDuplicate = async (base, table, freshestDateInAirtable) => {
    const records = await base(table)
        .select({
            filterByFormula: `{order_created_at} = '${freshestDateInAirtable}'`,
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

const getDataFromMongo = async (store, lastDate, collection, timezone) => {
    try {
        const minDate = toDate(lastDate ? lastDate : DEFAULT_MIN_DATE, { timeZone: timezone });

        const results = await mongo.client
            .db(process.env.MONGO_DATABASE)
            .collection(collection)
            .find({
                store_id: store.id,
                'created_at.date': { $gt: minDate },
            })
            .sort({ 'created_at.date': 1 })
            .limit(6000)
            .toArray();

        return results;
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error);

        return null;
    }
};

const formatData = (rows) =>
    rows.map(
        ({
            order_id,
            created_at,
            updated_at,
            cancelled_at,
            financial_status,
            currency,
            product_id,
            variant_id,
            name,
            quantity,
            profit,
            profit_per_unit,
            shipping_lines,
            turnover,
            detail: {
                line_item_price,
                line_item_tax_lines,
                line_item_discount_allocations,
                line_item_refund_quantity,
                line_item_refund_subtotal,
                line_item_refund_total_tax,
                line_item_ratio,
                line_item_shipping,
                line_item_refund_discrepancy,
                line_item_real_shipping_cost,
                line_item_inventory_cost,
                // order_shipping_lines_price,
                // order_shipping_final,
                // refund_discrepancy,
            },
        }) => ({
            fields: {
                order_id,
                order_created_at: created_at?.date,
                order_updated_at: updated_at?.date,
                order_cancelled_at: cancelled_at?.date,
                financial_status,
                currency,
                shipping_lines,
                product_id,
                variant_id,
                name,
                inventory_cost: line_item_inventory_cost,
                quantity,
                item_ratio: line_item_ratio,
                price: line_item_price,

                tax_lines: line_item_tax_lines,
                discount_allocations: line_item_discount_allocations,
                refund_subtotal: line_item_refund_subtotal,
                refund_quantity: line_item_refund_quantity,
                refund_total_tax: line_item_refund_total_tax,
                refund_discrepancy: line_item_refund_discrepancy,
                shipping_cost: line_item_shipping,
                real_shipping_cost: line_item_real_shipping_cost,

                turnover,
                profit,
                profit_per_unit,
            },
        }),
    );

export default async (table, collection, store, base, timezone) => {
    console.log('[Airtable Shopify] - Sync orders init - begin');

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

        console.log('[Airtable Shopify] - Sync orders init - sync airtable');

        await Promise.all(requests);
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error);
    } finally {
        console.log('[Airtable Shopify] - Sync orders init - end');
    }
};
