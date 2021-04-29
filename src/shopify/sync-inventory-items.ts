import { getInventoryItems } from './api/rest-api';
import mongo from '../mongo-connect';
import { formatISO } from 'date-fns';
import buildDateField from './lib/build-date-field';

const COLLECTION = 'shopify-inventory-items';

const API_MAX_RESULTS_PER_PAGE = 250;

const DEFAULT_MIN_DATE = '2010-12-31T23:00:00Z';

export default async (store, { private_app, shop }) => {
    try {
        while (true) {
            const results = await mongo.client
                .db(process.env.MONGO_DATABASE)
                .collection(COLLECTION)
                .find({ store_id: store.id })
                .project({ updated_at: '$updated_at.date' })
                .sort({ updated_at: -1 })
                .limit(1)
                .toArray();

            const params = {
                fields: ['id', 'cost', 'updated_at'],
                limit: API_MAX_RESULTS_PER_PAGE,
                order: 'updated_at asc',
                updated_at_min: results.length ? formatISO(results[0].updated_at) : DEFAULT_MIN_DATE,
            };

            console.log('[Shopify] inventory items from: %s.', params.updated_at_min);

            const inventoryItems = await getInventoryItems(private_app, params);

            console.log('[Shopify] inventory items retrieved: %d.', inventoryItems.length);

            if (!inventoryItems.length) return;

            const reducedInventoryItems = inventoryItems.reduce(
                (acc, { id, cost, updated_at }) => [
                    ...acc,
                    {
                        id: id ? `${id}` : null,
                        cost: parseFloat(cost),
                        updated_at: buildDateField(shop.iana_timezone, updated_at),
                    },
                ],
                [],
            );

            const { upsertedCount, modifiedCount } = await mongo.client
                .db(process.env.MONGO_DATABASE)
                .collection(COLLECTION)
                .bulkWrite(
                    reducedInventoryItems.map((reducedInventoryItem) => ({
                        updateOne: {
                            filter: {
                                store_id: store.id,
                                id: reducedInventoryItem.id,
                            },
                            update: { $set: { ...reducedInventoryItem, store_id: store.id } },
                            upsert: true,
                        },
                    })),
                );

            console.log('[Shopify] inventory items upserted/updated: %d/%d.', upsertedCount, modifiedCount);

            if (!upsertedCount && !modifiedCount) return;
        }
    } catch (error) {
        console.log('\x1b[31m[Shopify] inventory items ERROR: %s\x1b[0m', error);
    } finally {
        console.log('[Shopify] end');
    }
};
