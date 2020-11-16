const merchants = require('../merchants');
const mongo = require('./mongo-connect');
const syncers = {
  shopify: require('./shopify/syncer'),
  googleAnalytics: require('./google-analytics/syncer'),
  // googleAdwordsSyncData: require('./google-adwords/syncer')
};
    
/* const axios = require('axios');
axios.interceptors.request.use((request) => {
  const {url, params} = request;
  console.log('Starting Request', JSON.stringify({url, params}, null, 2))
  return request
}) */

const getSourcesToSync = (args) => {
  const argMerchant = args[2];

  if (!argMerchant) {
    throw Error('Could not find mandatory argument merchant id');
  }

  const merchant = merchants.find(({id}) => id === argMerchant);

  if (!merchant) {
    throw Error(`Could not find merchant with id '${argMerchant}'`);
  }

  const argSources = args.slice(3);
  
  if (!argSources.length) {
    return merchant.sources;
  }

  return argSources.reduce((acc, argSource) => {
    const merchantSource = merchant.sources.find(
      ({name}) => name === argSource
    );

    if (!merchantSource) {
      throw Error(`Merchant '${argMerchant}' doesn't have source '${argSource}'`);
    }

    return [...acc, merchantSource];
  }, []);
}

(async () => {
  try {
    const sources = getSourcesToSync(process.argv);
    await mongo.connect();
    await Promise.all(sources.map(source => syncers[source.name](source)));
  } catch (error) {
    console.log('\x1b[31mError: %s\x1b[0m', error.message);
  } finally {
    if (mongo.isConnected()) {
      await mongo.close();
    }
    console.log('[end]');
  }
})();
