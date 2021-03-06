import mongo from './mongo-connect';
import shopify from './shopify/syncer';
import googleAnalytics from './google-analytics/syncer';
import facebook from './facebook/syncer';
// import googleAdwords from './google-adwords/syncer';
// import googleAuth from './google-auth';
// import { getProfileList } from './google-analytics/api/google-analytics-v3-api';

const syncers = { shopify, googleAnalytics, facebook };

/* const axios = require('axios');
axios.interceptors.request.use((request) => {
  const {url, params} = request;
  console.log('Starting Request', JSON.stringify({url, params}, null, 2))
  return request
}) */

const getSourcesToSync = async (store, args) => {
    const argSources = args.slice(3);

    if (!argSources.length) return store.sources;

    return argSources.reduce((acc, argSource) => {
        const storeSource = store.sources.find(({ name }) => name === argSource);

        if (!storeSource) {
            throw Error(`Store '${store.id}' doesn't have source '${argSource}'`);
        }

        return [...acc, storeSource];
    }, []);
};

(async () => {
    try {
        // const profileList = await getProfileList(googleAuth, 93538952);

        const argStore = process.argv[2];

        if (!argStore) throw Error('Could not find mandatory argument store id');

        await mongo.connect();

        const store = await mongo.client.db(process.env.MONGO_DATABASE).collection('stores').findOne({ id: argStore });

        if (!store) throw Error(`Could not find store with id '${argStore}'`);

        const sources = await getSourcesToSync(store, process.argv);

        await Promise.all(sources.map((source) => syncers[source.name](store, source)));
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error.message);
    } finally {
        if (mongo.isConnected()) await mongo.close();
        console.log('[end]');
    }
})();
