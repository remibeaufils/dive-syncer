const merchants = require('../merchants');
const googleAuth = require('./google/auth');
const mongo = require('../mongo');
const shopifySyncOrders = require('./shopify/sync-orders');
const googleAnalyticsSyncData = require('./google/analytics/sync-data');
const googleAdwordsSyncData = require('./google/adwords/process-google-adwords');

/* const axios = require('axios');
axios.interceptors.request.use((request) => {
  const {url, params} = request;
  console.log('Starting Request', JSON.stringify({url, params}, null, 2))
  return request
}) */

async function initApp() {
  await Promise.all([
    googleAuth.authorize(),
    mongo.connect()
  ]);

  if(!googleAuth.isConnected() || !mongo.isConnected()) {
    throw Error('Couldn\'t init app')
  }
}

async function syncMerchant(merchant) {
  return await Promise.all([
    shopifySyncOrders(merchant),
    googleAnalyticsSyncData(merchant)
    // googleAdwordsSyncData(merchant);
    // facebookSyncData(merchant);
  ]);
}

async function run() {
  try {
    await initApp();
    
    await Promise.all(merchants.map(syncMerchant));
  } catch (error) {
    console.log('\x1b[31mError: %s\x1b[0m', error.message);
  } finally {
    mongo.close();
  }
};

run();
