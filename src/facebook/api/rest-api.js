const axios = require('axios');

const getEndpoint = (account_id) => {
  return `https://graph.facebook.com/v9.0/${account_id}`;
};

const getAccount = async (facebook, params) => {
  const { access_token, account_id } = facebook;

  // https://developers.facebook.com/docs/marketing-api/reference/ad-account/
  // { fields: 'currency,timezone_name' }
  
  try {
    const response = await axios.get(
      `${getEndpoint(account_id)}`,
      {
        params: {
          access_token,
          ...params
        }
      }
    );

    return response.data;    
  } catch (error) {
    console.log('\x1b[31mError: %s\x1b[0m', error.message);

    return [];    
  }
};

const getInsights = async (facebook, params) => {
  const { access_token, account_id } = facebook;

  // https://developers.facebook.com/docs/marketing-api/reference/ads-insights
  // https://developers.facebook.com/docs/marketing-api/insights/parameters/v9.0

  try {
    const response = await axios.get(
      `${getEndpoint(account_id)}/insights`,
      {
        params: {
          access_token,
          ...params
        }
      }
    );

    return response.data;    
  } catch (error) {
    console.log('\x1b[31mError: %s\x1b[0m', error.message);

    return [];    
  }
};

module.exports = { getAccount, getInsights };
