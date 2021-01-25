const facebookAPI = require('./api/rest-api');
const mongo = require('../mongo-connect');
// const { formatISO } = require('date-fns');

const COLLECTION = 'facebook';
// db.getCollection('facebook').createIndex({ updated_at: 1 })

module.exports = async (store, facebook) => {
  try {
    while (true) {
      console.log('[Facebook] insights from: %s.');

      // https://developers.facebook.com/docs/marketing-api/insights/parameters/v9.0

      // What time zone is used by reporting API
      // https://www.facebook.com/help/community/question/?id=1949627351935296
      // https://stackoverflow.com/questions/14442083/facebook-api-timezone-and-country

      const params = {
        fields: 'cpc,spend',
        time_range: '{"since":"2017-01-01","until":"2020-05-15"}',
        time_increment: 1
      };

      const insights = await facebookAPI.getInsights(facebook, params);

      console.log('[Facebook] insights retrieved: %d.');

      if (!insights.length) {
        return;
      }

      return;
    }
  } catch (error) {
    console.log('\x1b[31m[Facebook] insights ERROR: %s\x1b[0m', error);
  } finally {
    console.log('[Facebook] end');
  }
};
