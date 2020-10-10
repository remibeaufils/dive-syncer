const axios = require('axios');

const getEndpoint = ({key, password}, store) => `https://${key}:${password}@${store}.myshopify.com/admin/api/2020-07`;

const getOrders = async ({privateApp, store}, params) => {
  try {
    const response = await axios.get(
      `${getEndpoint(privateApp, store)}/orders.json`,
      {params}
    );

    return response.data.orders;    
  } catch (error) {
    console.log('Error: ', error.message);

    return [];    
  }
};

const getProducts = async ({privateApp, store}, params) => {
  try {
    const response = await axios.get(
      `${getEndpoint(privateApp, store)}/products.json`,
      {params}
    );

    return response.data.products;    
  } catch (error) {
    console.log(error);

    return null;    
  }
};

module.exports = { getOrders, getProducts };
