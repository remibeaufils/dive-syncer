import axios from 'axios';

const API_VERSION = '2021-01';

const getEndpoint = (private_app: string) => `${private_app}/admin/api/${API_VERSION}`;

const getOrders = async (private_app: string, params: Record<string, unknown>): Promise<any> => {
    try {
        const response = await axios.get(`${getEndpoint(private_app)}/orders.json`, { params });

        return response.data.orders;
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error.message);

        return [];
    }
};

const getProducts = async (private_app: string, params: Record<string, unknown>): Promise<any> => {
    try {
        const response = await axios.get(`${getEndpoint(private_app)}/products.json`, { params });

        return response.data.products;
    } catch (error) {
        console.log(error);

        return [];
    }
};

const getInventoryItems = async (private_app: string, params: Record<string, unknown>): Promise<any> => {
    try {
        const response = await axios.get(`${getEndpoint(private_app)}/inventory_items.json`, { params });

        return response.data.products;
    } catch (error) {
        console.log(error);

        return [];
    }
};

const getInventoryLevels = async (private_app: string, params: Record<string, unknown>): Promise<any> => {
    try {
        const response = await axios.get(`${getEndpoint(private_app)}/inventory_levels.json`, { params });

        return response.data.products;
    } catch (error) {
        console.log(error);

        return [];
    }
};

const postWebhook = async (private_app, body) => {
    try {
        const response = await axios.post(`${getEndpoint(private_app)}/webhooks.json`, JSON.stringify(body), {
            headers: { 'Content-Type': 'application/json' },
        });

        return response.data.webhook;
    } catch (error) {
        console.log(error);

        return [];
    }
};

export { getOrders, getProducts, getInventoryItems, getInventoryLevels, postWebhook };
