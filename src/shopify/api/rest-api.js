const axios = require('axios');

const getEndpoint = (shopify) => {
  const { privateApp: { key, password }, storeId } = shopify;

  return `https://${key}:${password}@${storeId}.myshopify.com/admin/api/2020-10`;
};

const getOrders = async (shopify, params) => {
  try {
    const response = await axios.get(
      `${getEndpoint(shopify)}/orders.json`,
      {params}
    );

    return response.data.orders;    
  } catch (error) {
    console.log('\x1b[31mError: %s\x1b[0m', error.message);

    return [];    
  }
};

const getProducts = async ({privateApp, storeId}, params) => {
  try {
    const response = await axios.get(
      `${getEndpoint(privateApp, storeId)}/products.json`,
      {params}
    );

    return response.data.products;    
  } catch (error) {
    console.log(error);

    return null;    
  }
};

module.exports = { getOrders, getProducts };
