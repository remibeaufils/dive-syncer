import Record from 'airtable/lib/record';
import { toDate } from 'date-fns-tz';
import mongo from '../../mongo-connect';

const DEFAULT_MIN_DATE = '2021-01-01';
const AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST = 10;

const getFreshestDateInAirtable = async (base, table) => {
    const records = await base(table)
        .select({
            maxRecords: 1,
            sort: [{ field: 'product_updated_at', direction: 'desc' }],
        })
        .all();

    return records?.[0]?.get('product_updated_at');
};

const getDataFromMongo = async (store, lastDate, collection, timezone) => {
    try {
        const minDate = toDate(lastDate ? lastDate : DEFAULT_MIN_DATE, { timeZone: timezone });

        // TODO Lookup to get info inventory item and level.

        const results = await mongo.client
            .db(process.env.MONGO_DATABASE)
            .collection(collection)
            .find({ store_id: store.id, 'product_updated_at.date': { $gt: minDate } })
            .toArray();

        return results;
    } catch (error) {
        return null;
    }
};

const formatData = (rows) =>
    rows.map(
        ({
            product_type,
            product_title,
            variant_title,
            product_image,
            variant_sku,
            variant_price,
            inventory_item_cost,
            inventory_level_available,
            product_id,
            variant_id,
            product_updated_at,
            variant_updated_at,
        }) => ({
            fields: {
                product_type,
                product_title,
                variant_title,
                // product_image: [
                //     {
                //         url: product_image || 'https://via.placeholder.com/150',
                //     },
                // ],
                variant_sku,
                variant_price,
                inventory_item_cost,
                inventory_level_available,
                product_id,
                variant_id,
                product_updated_at: product_updated_at.date,
                variant_updated_at: variant_updated_at.date,
            },
        }),
    );

export default async (table, collection, store, base, timezone) => {
    console.log('[Airtable Shopify] - Sync products - begin');

    try {
        const freshestDateInAirtable = await getFreshestDateInAirtable(base, table);

        const data = await getDataFromMongo(store, freshestDateInAirtable, collection, timezone);

        if (!data) return;

        const formattedData = formatData(data);

        const requests: Promise<Record>[] = [];

        // for (let i = 0; i < Math.ceil(formattedData.length / AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST); i++) {
        //     requests.push(
        //         base(table).create(
        //             formattedData.slice(
        //                 i * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
        //                 (i + 1) * AIRTABLE_MAXIMUM_RECORDS_PER_REQUEST,
        //             ),
        //         ),
        //     );
        // }

        // Deduce if have to create or update record.

        const creates: any[] = [];
        const updates: any[] = [];

        await Promise.all(
            formattedData.map(async (data) => {
                const records = await base(table)
                    .select({
                        view: 'All',
                        maxRecords: 1,
                        fields: ['product_id', 'variant_id'],
                        filterByFormula: `AND({product_id} = '${data.fields.product_id}', {variant_id} = '${data.fields.variant_id}')`,
                    })
                    .all();

                if (records && records.length)
                    updates.push({
                        id: records[0].id,
                        ...data,
                    });
                else creates.push(data);
            }),
        );

        // For each udpates, push batch of 10 into records.

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

        // For each creates, push batch of 10 into records.

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
        console.log('\x1b[31mError: %s\x1b[0m', error);
    } finally {
        console.log('[Airtable Shopify] - Sync products - end');
    }
};
