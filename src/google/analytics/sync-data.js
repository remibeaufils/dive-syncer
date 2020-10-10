const gaAPI = require('./google-analyticsreporting-v4-api');
const googleAuth = require('../auth');
const mongo = require('../../../mongo');
const moment = require('moment');

const COLLECTION = 'google-analytics';

module.exports = async ({database, googleAnalytics}) => {
  const YESTERDAY = moment().subtract(1, 'days').startOf('day');

  const results = await mongo.client.db(database)
    .collection(COLLECTION)
    .find()
    .project({ 'ga:date': 1 })
    .sort({ 'ga:date':-1 })
    .limit(1)
    .toArray();

  const minDate = !results.length
    ? moment('2019-01-01', 'YYYYMMDD') // by default = min shopify order created_at?
    : moment(results[0]['ga:date'], 'YYYYMMDD')
      .add(1, 'd');

  if (minDate.isSame(YESTERDAY, 'd')) {
    console.log('Google Analytics everything already retrieved.');
    return;
  }

  console.log('[Google Analytics] data request: %s.', minDate.toISOString());

  const dateRanges = [{
    startDate: minDate.format('YYYY-MM-DD'),
    // endDate: minDate.clone().add(1, 'd').format('YYYY-MM-DD')
    endDate: 'yesterday'
  }];

  const reports = await gaAPI.batchGet({
    auth: googleAuth.jwtClient,
    resource: {
      reportRequests: [
        {
          viewId: `${googleAnalytics.viewId}`,
          dateRanges,
          metrics: [
            {expression: 'ga:sessions'},
            {expression: 'ga:users'},
            {expression: 'ga:newUsers'},
            {expression: 'ga:users-ga:newUsers', alias: 'returning users'},
            {expression: 'ga:bounceRate'},
          ],
          dimensions: [
            {name: 'ga:date'},
          ],
          // pageToken: '10000',
          pageSize: '10000' // Taken from `nextPageToken` of a previous response.
        },
        {
          viewId: `${googleAnalytics.viewId}`,
          dateRanges,
          metrics: [
            {expression: 'ga:adCost'}, // , formattingType: 'CURRENCY'
            {expression: 'ga:transactionRevenue'},
            {expression: 'ga:ROAS'},
            {expression: 'ga:transactions'},
            {expression: 'ga:impressions'},
            {expression: 'ga:CPM'},
            {expression: 'ga:adClicks'},
            {expression: 'ga:CPC'},
          ],
          dimensions: [
            {name: 'ga:date'},
            // {name: 'ga:yearMonth'},
            // {name: 'ga:week'},
            // {name: 'ga:day'},
            // {name: 'ga:month'},
            // {name: 'ga:year'},
            // {name: 'ga:source'}
            {name: 'ga:campaign'},
            // {name: 'ga:adwordsCampaignID'}
          ],
          filtersExpression: 'ga:adwordsCampaignID!=(not set)',
          // pageToken: '10000',
          pageSize: '10000' // Taken from `nextPageToken` of a previous response.
        },

        /* {
          viewId: `${googleAnalytics.viewId}`,
          dateRanges: [{startDate: '2019-01-01', endDate: '2019-01-02'}],
          metrics: [
            // {expression: 'ga:cohortSessionsPerUser'}
            // {expression: 'ga:users'},
            {expression: 'ga:sessions'},
            {expression: 'ga:visits'},
            {expression: 'ga:bounceRate'},
          ],
          dimensions: [
            {name: 'ga:channelGrouping'},
            {name: 'ga:yearWeek'},
            // {name: 'ga:acquisitionTrafficChannel'}
          ]
        } */
      ]
    }
  });

  // saveInGSheet2(auth, spreadsheet, headers, rows);

  console.log('[Google Analytics] reports retrieved: %d.', reports.length);

  if (!reports.length || !reports.filter(({rows}) => !!rows.length).length) {
    console.log('[Google Analytics] no data');
    return;
  }

  await Promise.all(
    reports.map(async ({headers, rows}) => {
      const rowsFormatted = rows.map(row =>
        row.reduce((acc, val, index) => ({...acc, [headers[index]]: val}), {})
      );

      const {upsertedCount, modifiedCount} = await mongo.client.db(database)
        .collection(COLLECTION)
        .bulkWrite(
          rowsFormatted.map(rowFormatted => ({
            updateOne: {
              filter: {
                'ga:date' : rowFormatted['ga:date'],
                'ga:campaign' : rowFormatted['ga:campaign']
              },
              update: { $set: rowFormatted },
              upsert: true
            }
          }))
        );

      console.log('[Google Analytics] rows upserted/updated: %d/%d.', upsertedCount, modifiedCount);
    })
  );
};

/* const saveInGSheet = async (auth, spreadsheet, headers, rows) => {
  gsheetAPI.valuesUpdate({
    auth,
    valueInputOption: 'USER_ENTERED', // INPUT_VALUE_OPTION_UNSPECIFIED, RAW
    // insertDataOption: 'INSERT_ROWS',
    resource: {values : [headers, ...rows]},
    spreadsheetId: spreadsheet.id,
    range: spreadsheet.sheets.googleAnalytics.name
  });
}; */

/* const saveInGSheet2 = async (auth, spreadsheet, headers, rows) => {
  await gsheetAPI.batchUpdate({
    auth,
    spreadsheetId: spreadsheet.id,
    resource: {
      requests: [
        // {
        //   appendDimension: {
        //     sheetId: config.SHEET_ID,
        //     dimension: 'ROWS',
        //     length: all_rows - max_rows
        //   }
        // },

        // {
        //   "insertRange": {
        //     "range": {
        //     "sheetId": spreadsheet.sheets.googleAnalytics.id,
        //     "startRowIndex": 1,
        //     "endRowIndex": 4
        //     },
        //     "shiftDimension": "ROWS"
        //   }
        // },

        {
          'pasteData': {
            'data': headers.toString(),
            'type': 'PASTE_NORMAL', // Enum: PASTE_NORMAL, PASTE_VALUES, PASTE_FORMAT, PASTE_NO_BORDERS, PASTE_FORMULA, PASTE_DATA_VALIDATION, PASTE_CONDITIONAL_FORMATTING
            'delimiter': ',',
            'coordinate': {
              'sheetId': spreadsheet.sheets.googleAnalytics.id,
              'rowIndex': 0,
            }
          }
        },

        {
          'insertDimension': {
            'range': {
              'sheetId': spreadsheet.sheets.googleAnalytics.id,
              'dimension': 'ROWS',
              'startIndex': 1,
              'endIndex': rows.length + 1
            },
            'inheritFromBefore': false
          }
        },

        ...rows.map((row, index) => ({
          'pasteData': {
            'data': row.toString(),
            'type': 'PASTE_NORMAL',
            'delimiter': ',',
            'coordinate': {
              'sheetId': spreadsheet.sheets.googleAnalytics.id,
              'rowIndex': index + 1,
            }
          }
        }))
      ]
    }
  });
}; */
