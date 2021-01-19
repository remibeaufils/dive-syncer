const axios = require('axios');

const getEndpoint = (accountId) => {
  return `https://graph.facebook.com/v9.0/${accountId}/insights`;
};

const getInsights = async (facebook, params) => {
  const { accessToken, accountId } = facebook;

  try {
    const response = await axios.get(
      getEndpoint(accountId),
      {
        params: {
          access_token: accessToken,
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
