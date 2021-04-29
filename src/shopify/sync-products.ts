import { getProducts } from './api/rest-api';
import mongo from '../mongo-connect';
import { formatISO } from 'date-fns';
import buildDateField from './lib/build-date-field';

const COLLECTION = 'shopify-products';

const API_MAX_RESULTS_PER_PAGE = 250;

const DEFAULT_MIN_DATE = '2010-12-31T23:00:00Z';

export default async (store, { private_app, shop }) => {
    console.log('[Shopify] - Sync products - begin');

    try {
        while (true) {
            const results = await mongo.client
                .db(process.env.MONGO_DATABASE)
                .collection(COLLECTION)
                .find({ store_id: store.id })
                .project({ product_updated_at: '$product_updated_at.date' })
                .sort({ product_updated_at: -1 })
                .limit(1)
                .toArray();

            const params = {
                fields: ['id', 'title', 'handle', 'product_type', 'image', 'variants', 'updated_at'],
                limit: API_MAX_RESULTS_PER_PAGE,
                order: 'updated_at asc',
                updated_at_min: results.length ? formatISO(results[0].product_updated_at) : DEFAULT_MIN_DATE,
            };

            console.log('[Shopify] products from: %s.', params.updated_at_min);

            const products = await getProducts(private_app, params);

            console.log('[Shopify] products retrieved: %d.', products.length);

            if (!products.length) return;

            const reducedProducts = products.reduce(
                (acc, { id, title, handle, product_type, image, variants, updated_at }) => [
                    ...acc,
                    ...variants.map(
                        ({
                            id: variant_id,
                            title: variant_title,
                            sku,
                            price,
                            updated_at: variant_updated_at,
                            inventory_item_id,
                        }) => ({
                            product_id: id ? `${id}` : null,
                            product_title: title,
                            product_handle: handle,
                            product_type,
                            product_image: image?.src,
                            product_updated_at: buildDateField(shop.iana_timezone, updated_at),
                            variant_id: variant_id ? `${variant_id}` : null,
                            variant_title: variant_title,
                            variant_sku: sku,
                            variant_price: parseFloat(price),
                            variant_updated_at: buildDateField(shop.iana_timezone, variant_updated_at),
                            variant_inventory_item_id: inventory_item_id ? `${inventory_item_id}` : null,
                        }),
                    ),
                ],
                [],
            );

            const { upsertedCount, modifiedCount } = await mongo.client
                .db(process.env.MONGO_DATABASE)
                .collection(COLLECTION)
                .bulkWrite(
                    reducedProducts.map((reducedProduct) => ({
                        updateOne: {
                            filter: {
                                store_id: store.id,
                                product_id: reducedProduct.product_id,
                                variant_id: reducedProduct.variant_id,
                            },
                            update: { $set: { ...reducedProduct, store_id: store.id } },
                            upsert: true,
                        },
                    })),
                );

            console.log('[Shopify] products upserted/updated: %d/%d.', upsertedCount, modifiedCount);

            if (!upsertedCount && !modifiedCount) return;
        }
    } catch (error) {
        console.log('\x1b[31m[Shopify] products ERROR: %s\x1b[0m', error);
    } finally {
        console.log('[Shopify] end');
    }
};
