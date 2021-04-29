import { getOrders } from './api/rest-api';
import mongo from '../mongo-connect';
import orderReducer from './lib/order-reducer';
import { formatISO } from 'date-fns';

const COLLECTION = 'shopify-order-line-item';
// db.getCollection('shopify-order-line-item').createIndex({ updated_at: 1 })

// CONTROL A === B
// A: db.getCollection("shopify-order-line-item").count()
// B: https://boutique-masque-antipollution-r-pur.myshopify.com/admin/api/2020-10/orders/count.json?status=any

const API_MAX_RESULTS_PER_PAGE = 250;

const DEFAULT_MIN_DATE = '2020-12-31T23:00:00Z';

export default async (store, { private_app, shop }) => {
    console.log('[Shopify] - Sync orders - begin');

    try {
        while (true) {
            const results = await mongo.client
                .db(process.env.MONGO_DATABASE)
                .collection(COLLECTION)
                .find({ store_id: store.id })
                .project({ updated_at: '$updated_at.date' })
                .sort({ updated_at: -1 })
                // .project({ created_at: '$created_at.date' })
                // .sort({ created_at: -1 })
                .limit(1)
                .toArray();

            const params = {
                fields: [
                    'id',
                    'order_number',
                    'financial_status',
                    'customer',
                    'created_at',
                    'updated_at',
                    'cancelled_at',
                    'shipping_lines',
                    'refunds',
                    'line_items',
                    'currency',
                ],
                limit: API_MAX_RESULTS_PER_PAGE,
                status: 'any',
                order: 'updated_at asc',
                updated_at_min: results.length ? formatISO(results[0].updated_at) : DEFAULT_MIN_DATE,
                // order: 'created_at asc',
                // created_at_min: results.length ? formatISO(results[0].created_at) : DEFAULT_MIN_DATE,
            };

            console.log('[Shopify] orders from: %s.', params.updated_at_min);
            // console.log('[Shopify] orders from: %s.', params.created_at_min);

            const orders = await getOrders(private_app, params);

            console.log('[Shopify] orders retrieved: %d.', orders.length);

            if (!orders.length) return;

            const lineItems = orders.reduce(
                (acc, order) => [...acc, ...orderReducer(shop, store.real_shipping_costs, order)],
                [],
            );

            const { upsertedCount, modifiedCount } = await mongo.client
                .db(process.env.MONGO_DATABASE)
                .collection(COLLECTION)
                .bulkWrite(
                    lineItems.map((lineItem) => ({
                        updateOne: {
                            filter: {
                                store_id: store.id,
                                order_id: lineItem.order_id,
                                variant_id: lineItem.variant_id,
                            },
                            update: { $set: { ...lineItem, store_id: store.id } },
                            upsert: true,
                        },
                    })),
                );

            console.log('[Shopify] orders upserted/updated: %d/%d.', upsertedCount, modifiedCount);

            if (!upsertedCount && !modifiedCount) return;
        }
    } catch (error) {
        console.log('\x1b[31m[Shopify] orders ERROR: %s\x1b[0m', error);
    } finally {
        console.log('[Shopify] end');
    }
};
