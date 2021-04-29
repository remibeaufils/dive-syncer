import mongo from './mongo-connect';
import googleAnalytics from './airtable/google-analytics/syncer';
import facebook from './airtable/facebook/syncer';
import shopify from './airtable/shopify/syncer';

const syncers = { googleAnalytics, facebook, shopify };

const getBasesToSync = async (store, outputAirtable, args) => {
    const argBases = args.slice(3);

    if (!argBases.length) return outputAirtable.bases;

    return argBases.reduce((acc, argBase) => {
        const storeBase = outputAirtable.bases.find(({ name }) => name === argBase);

        if (!storeBase) {
            throw Error(`Store '${store.id}' doesn't have base '${argBases}'`);
        }

        return [...acc, storeBase];
    }, []);
};

(async () => {
    try {
        const argStore = process.argv[2];

        if (!argStore) throw Error('Could not find mandatory argument store id');

        await mongo.connect();

        const store = await mongo.client.db(process.env.MONGO_DATABASE).collection('stores').findOne({ id: argStore });

        if (!store) throw Error(`Could not find store with id '${argStore}'`);

        const outputAirtable = store.outputs.find(({ name }) => name === 'airtable');

        if (!outputAirtable) throw Error(`Store id '${argStore} doesn't have output Airtable'`);

        const bases = await getBasesToSync(store, outputAirtable, process.argv);

        await Promise.all(bases.map((base) => syncers[base.name](store, outputAirtable.api_key, base)));
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error.message);
    } finally {
        if (mongo.isConnected()) await mongo.close();
        console.log('[Airtable] end');
    }
})();
