const axios = require('axios');

const getEndpoint = ({key, password}, store) => `https://${key}:${password}@${store}.myshopify.com/admin/api/2020-10`;

const getOrders = async ({privateApp, storeId}, params) => {
  try {
    const response = await axios.get(
      `${getEndpoint(privateApp, storeId)}/orders.json`,
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
