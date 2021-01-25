const axios = require('axios');

const API_VERSION = '2021-01';

const getEndpoint = private_app => `${private_app}/admin/api/${API_VERSION}`;

const getOrders = async (private_app, params) => {
  try {
    const response = await axios.get(
      `${getEndpoint(private_app)}/orders.json`,
      {params}
    );

    return response.data.orders;    
  } catch (error) {
    console.log('\x1b[31mError: %s\x1b[0m', error.message);

    return [];    
  }
};

const getProducts = async ({private_app}, params) => {
  try {
    const response = await axios.get(
      `${getEndpoint(private_app)}/products.json`,
      {params}
    );

    return response.data.products;    
  } catch (error) {
    console.log(error);

    return null;    
  }
};

module.exports = { getOrders, getProducts };
