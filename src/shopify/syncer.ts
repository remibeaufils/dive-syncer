// import { postWebhook } from './api/rest-api';
import syncProducts from './sync-products';
import syncInventoryItems from './sync-inventory-items';
import syncInventoryLevels from './sync-inventory-levels';
import syncOrders from './sync-orders';

export default async (store, shopify) => {
    // const merchant = 'r-pur';
    // const shop = 'boutique-masque-antipollution-r-pur';
    // const shop = 'r-pur-kercambre';

    // const merchant = 'cabaiashop';
    // const shop = 'cabaiashop';
    // const shop = 'cabaiashop-eu';

    // await postWebhook(private_app, {
    //     webhook: {
    //         topic: 'orders/create',
    //         address: `https://www.dev.api.diveanalytics.co/shopify/webhooks/${merchant}/${shop}/orders/create`,
    //         format: 'json',
    //     },
    // });

    // await postWebhook(
    //     'https://46c13673b1e5d7906b0caab2f953a17c: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@boutique-masque-antipollution-r-pur.myshopify.com',
    //     {
    //         webhook: {
    //             topic: 'orders/updated',
    //             address: `https://www.dev.api.diveanalytics.co/shopify/webhooks/r-pur/boutique-masque-antipollution-r-pur/orders/updated`,
    //             format: 'json',
    //         },
    //     },
    // );

    // await postWebhook(
    //     'https://4e5d7728ee70a74e53500e1fa76ab9d7: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@cabaiashop.myshopify.com',
    //     {
    //         webhook: {
    //             topic: 'orders/updated',
    //             address: `https://www.dev.api.diveanalytics.co/shopify/webhooks/cabaia/cabaiashop/orders/updated`,
    //             format: 'json',
    //         },
    //     },
    // );

    await syncProducts(store, shopify);
    // await syncInventoryItems(store, shopify);
    // await syncInventoryLevels(store, shopify);
    // await syncOrders(store, shopify);
};
