import { getInventoryLevels } from './api/rest-api';
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
                fields: ['inventory_item_id', 'available', 'updated_at'],
                limit: API_MAX_RESULTS_PER_PAGE,
                order: 'updated_at asc',
                updated_at_min: results.length ? formatISO(results[0].updated_at) : DEFAULT_MIN_DATE,
            };

            console.log('[Shopify] inventory levels from: %s.', params.updated_at_min);

            const inventoryLevels = await getInventoryLevels(private_app, params);

            console.log('[Shopify] inventory levels retrieved: %d.', inventoryLevels.length);

            if (!inventoryLevels.length) return;

            const reducedInventoryLevels = inventoryLevels.reduce(
                (acc, { inventory_item_id, available, updated_at }) => [
                    ...acc,
                    {
                        inventory_item_id: inventory_item_id ? `${inventory_item_id}` : null,
                        available,
                        updated_at: buildDateField(shop.iana_timezone, updated_at),
                    },
                ],
                [],
            );

            const { upsertedCount, modifiedCount } = await mongo.client
                .db(process.env.MONGO_DATABASE)
                .collection(COLLECTION)
                .bulkWrite(
                    reducedInventoryLevels.map((reducedInventoryLevel) => ({
                        updateOne: {
                            filter: {
                                store_id: store.id,
                                inventory_item_id: reducedInventoryLevel.inventory_item_id,
                            },
                            update: { $set: { ...reducedInventoryLevel, store_id: store.id } },
                            upsert: true,
                        },
                    })),
                );

            console.log('[Shopify] inventory levels upserted/updated: %d/%d.', upsertedCount, modifiedCount);

            if (!upsertedCount && !modifiedCount) return;
        }
    } catch (error) {
        console.log('\x1b[31m[Shopify] inventory levels ERROR: %s\x1b[0m', error);
    } finally {
        console.log('[Shopify] end');
    }
};
