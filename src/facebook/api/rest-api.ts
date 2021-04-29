import axios from 'axios';

const BASE_URL = 'https://graph.facebook.com/v9.0';

const getAccessToken = async (): Promise<string | null> => {
    try {
        const response = await axios.get(`${BASE_URL}/oauth/access_token`, {
            params: {
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                grant_type: 'client_credentials',
            },
        });

        return response.data.access_token;
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error.message);

        return null;
    }
};

const getLonglivedAccessToken = async (access_token: string): Promise<string | null> => {
    try {
        const response = await axios.get(`${BASE_URL}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                fb_exchange_token: access_token,
            },
        });

        return response.data.access_token;
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error.response.data.error.message);

        return null;
    }
};

const debugToken = async (access_token: string): Promise<Record<string, unknown> | null> => {
    try {
        const response = await axios.get(`${BASE_URL}/debug_token`, {
            params: {
                access_token,
                input_token: access_token,
            },
        });

        return response.data;
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error.response.data.error.message);

        return null;
    }
};

const getAccount = async (facebook, params) => {
    const { access_token, account_id } = facebook;

    // https://developers.facebook.com/docs/marketing-api/reference/ad-account/
    // { fields: 'currency,timezone_name' }

    try {
        const response = await axios.get(`${BASE_URL}/${account_id}`, {
            params: {
                access_token,
                ...params,
            },
        });

        return response.data;
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error.response.data.error.message);

        return null;
    }
};

const getInsights = async (facebook, params, next) => {
    const { access_token, account_id } = facebook;

    // https://developers.facebook.com/docs/marketing-api/reference/ads-insights
    // https://developers.facebook.com/docs/marketing-api/insights/parameters/v9.0
    // ? https://stackoverflow.com/questions/43933745/facebook-marketing-api-hourly-breakdown

    try {
        const response = await axios.get(next ? next : `${BASE_URL}/${account_id}/insights`, {
            params: {
                access_token,
                ...params,
            },
        });

        return response.data;
    } catch (error) {
        console.log('\x1b[31mError: %s\x1b[0m', error.response.data.error.message);

        return [];
    }
};

export { debugToken, getAccessToken, getLonglivedAccessToken, getAccount, getInsights };
