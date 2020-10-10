const shopifyAPI = require('./rest-api');
const mongo = require('../../mongo');

const COLLECTION = 'shopify-orders';
// db.getCollection('shopify-orders').createIndex({ updated_at: 1 })
// db.getCollection("shopify-orders").count()
// https://boutique-masque-antipollution-r-pur.myshopify.com/admin/api/2020-07/orders/count.json?status=any

module.exports = async ({database, shopify}) => {
  let stop = false;

  while (!stop) {
    try {
      const results = await mongo.client.db(database)
        .collection(COLLECTION)
        .find()
        .project({id: 1, updated_at: 1})
        .sort({ updated_at: -1 })
        .limit(1)
        .toArray();

      const params = {
        status: 'any',
        limit: 250,
        updated_at_min: !results.length ? null : results[0].updated_at,
        order: 'updated_at asc',
        // fields: ['id', 'updated_at', 'status', 'line_items', 'total_price'],
      };

      console.log('[Shopify] orders from: %s.', params.updated_at_min);

      const orders = await shopifyAPI.getOrders(shopify, params);

      console.log('[Shopify] orders retrieved: %d.', orders.length);

      if (!orders.length) {
        return;
      }

      // saveInGSheet(auth, spreadsheet, orders);

      const {upsertedCount, modifiedCount} = await mongo.client.db(database)
        .collection(COLLECTION)
        .bulkWrite(
          orders.map(order => ({
            updateOne: {
              filter: { id : order.id },
              update: { $set: order },
              upsert: true
            }
          }))
        );

        console.log('[Shopify] orders upserted/updated: %d/%d.', upsertedCount, modifiedCount);

      if (!upsertedCount && !modifiedCount) {
        stop = true;
      }
    } catch (error) {
      console.log('\x1b[31m[Shopify] orders ERROR: %s\x1b[0m', error);
    }
  }
};

/* const saveInGSheet = async (auth, spreadsheet, orders) => {
  // todo: get range end from gsheet THEN append at the end of the range!

  // readMerchantSheet({
  //   auth,
  //   spreadsheetId: spreadsheet.id,
  //   range: spreadsheet.sheets.shopify.name
  // });

  const headers = Object.keys(orders[0]);

  const rows = orders.map(order =>
    Object.values(order).map(value =>
      typeof value === 'object' ? JSON.stringify(value) : value
    )
  );

  await gsheetAPI.valuesUpdate({
    auth,
    valueInputOption: 'USER_ENTERED', // INPUT_VALUE_OPTION_UNSPECIFIED, RAW
    resource: {values : [headers, ...rows]},
    spreadsheetId: spreadsheet.id,
    range: spreadsheet.sheets.shopify.name
  });
}; */
