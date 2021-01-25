const axios = require('axios');

const getEndpoint = (account_id) => {
  return `https://graph.facebook.com/v9.0/${account_id}/insights`;
};

const getInsights = async (facebook, params) => {
  const { access_token, account_id } = facebook;

  try {
    const response = await axios.get(
      getEndpoint(account_id),
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

module.exports = { getInsights };
