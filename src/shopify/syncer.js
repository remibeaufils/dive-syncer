const shopifyAPI = require('./api/rest-api');
const mongo = require('../mongo-connect');

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
        .find({ storeId: shopify.storeId })
        .project({ id: 1, updated_at: 1 })
        .sort({ updated_at: -1 })
        .limit(1)
        .toArray();

      const params = {
        // fields: ['id', 'updated_at', 'status', 'line_items', 'total_price'],
        limit: API_MAX_RESULTS_PER_PAGE,
        order: 'updated_at asc',
        status: 'any',
        updated_at_min: results.length ? results[0].updated_at : null
      };

      console.log('[Shopify] orders from: %s.', params.updated_at_min);

      const orders = await shopifyAPI.getOrders(shopify, params);

      console.log('[Shopify] orders retrieved: %d.', orders.length);

      if (!orders.length) {
        return;
      }

      const { upsertedCount, modifiedCount } = await mongo.client.db(shopify.database)
        .collection(COLLECTION)
        .bulkWrite(
          orders.map((order) => ({
            updateOne: {
              filter: { storeId: shopify.storeId, id: order.id },
              update: { $set: { storeId: shopify.storeId, ...order } },
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
