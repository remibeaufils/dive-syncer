const shopifyAPI = require('./api/rest-api');
const mongo = require('../mongo-connect');
const orderReducer = require('./lib/order-reducer');
const { formatISO } = require('date-fns');

const COLLECTION = 'shopify-orders';
// db.getCollection('shopify-orders').createIndex({ updated_at: 1 })

// CONTROL A === B
// A: db.getCollection("shopify-orders").count()
// B: https://boutique-masque-antipollution-r-pur.myshopify.com/admin/api/2020-10/orders/count.json?status=any

const API_MAX_RESULTS_PER_PAGE = 250;

module.exports = async (shopify) => {
  try {
    while (true) {
      const results = await mongo.client.db(shopify.database)
        .collection(COLLECTION)
        .find({ store_id: shopify.storeId })
        .project({ updated_at: 1 })
        .sort({ updated_at: -1 })
        .limit(1)
        .toArray();

      const params = {
        fields: ['id', 'created_at', 'updated_at', 'cancelled_at', 'shipping_lines', 'refunds', 'line_items', 'currency'],
        limit: API_MAX_RESULTS_PER_PAGE,
        order: 'updated_at asc',
        status: 'any',
        updated_at_min: results.length ? formatISO(results[0].updated_at) : null
      };

      console.log('[Shopify] orders from: %s.', params.updated_at_min);

      const orders = await shopifyAPI.getOrders(shopify, params);

      console.log('[Shopify] orders retrieved: %d.', orders.length);

      if (!orders.length) {
        return;
      }

      const lineItems = orders.reduce(
        (acc, order) => [... acc, ...orderReducer(order)],
        []
      );

      const { upsertedCount, modifiedCount } = await mongo.client.db(shopify.database)
        .collection(COLLECTION)
        .bulkWrite(
          lineItems.map((lineItem) => ({
            updateOne: {
              filter: {
                store_id: shopify.storeId,
                order_id: lineItem.order_id,
                variant_id: lineItem.variant_id
              },
              update: { $set: { store_id: shopify.storeId, ...lineItem } },
              upsert: true
            }
          }))
        );

        console.log(
          '[Shopify] orders upserted/updated: %d/%d.',
          upsertedCount,
          modifiedCount
        );

      if (!upsertedCount && !modifiedCount) {
        return;
      }
    }
  } catch (error) {
    console.log('\x1b[31m[Shopify] orders ERROR: %s\x1b[0m', error);
  } finally {
    console.log('[Shopify] end');
  }
};
