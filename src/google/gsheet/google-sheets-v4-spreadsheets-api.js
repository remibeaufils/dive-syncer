const { google } = require('googleapis');

const spreadsheets = google.sheets('v4').spreadsheets;

const readMerchantSheet = async (params) => {
  try {
    const response = await spreadsheets.values.get(params);

    console.log('Data from Google Sheets:');

    for (let row of response.data.values) {
      console.log('Title [%s]\t\tRating [%s]', row[0], row[1]);
    }
  } catch (error) {
    console.log('The API returned an error: ' + error);
  }
};

const batchUpdate = async (params) => {
  try {
    const response = await spreadsheets.batchUpdate(params);

    console.log('%s: %d cells updated.', params.range, response.data.updatedCells);
  } catch (error) {
    console.log('The API returned an error: ' + error);
  }
};

const valuesUpdate = async (params) => {
  try {
    const response = await spreadsheets.values.update(params);

    console.log('%s: %d cells updated.', params.range, response.data.updatedCells);
  } catch (error) {
    console.log('The API returned an error: ' + error);
  }
};

module.exports = {
  batchUpdate,
  readMerchantSheet,
  valuesUpdate
};
