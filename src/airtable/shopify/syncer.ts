import Airtable from 'airtable';
import syncOrders from './sync-orders';
import syncOrdersInit from './sync-orders-init';
import syncProducts from './sync-products';
import syncDashboard from './sync-dashboard';

export default async (store, api_key, { id: base_id, timezone }) => {
    if (!api_key || !base_id) return null;

    const base = new Airtable({ apiKey: api_key }).base(base_id);

    return await Promise.all([
        // syncProducts('Products', 'shopify-products', store, base, timezone),
        // syncOrdersInit('Orders', 'shopify-order-line-item', store, base, timezone),
        // syncOrders('Orders', 'shopify-order-line-item', store, base, timezone),
        syncDashboard('Dashboard', 'shopify-order-line-item', store, base, timezone),
    ]);
};
