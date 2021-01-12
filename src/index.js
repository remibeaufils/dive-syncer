const stores = require('../stores');
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
  const argStore = args[2];

  if (!argStore) {
    throw Error('Could not find mandatory argument store id');
  }

  const store = stores.find(({id}) => id === argStore);

  if (!store) {
    throw Error(`Could not find store with id '${argStore}'`);
  }

  const argSources = args.slice(3);
  
  if (!argSources.length) {
    return store.sources.map(source => ({ ...source, database: store.database, storeId: store.id }));
  }

  return argSources.reduce((acc, argSource) => {
    const storeSource = store.sources.find(
      ({name}) => name === argSource
    );

    if (!storeSource) {
      throw Error(`Store '${argStore}' doesn't have source '${argSource}'`);
    }

    return [...acc, { ...storeSource, database: store.database, storeId: store.id }];
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
