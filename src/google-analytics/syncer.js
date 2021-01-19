const gaAPI = require('./api/google-analyticsreporting-v4-api');
const googleAuth = require('../google-auth');
const { addDays, format, isSameDay, parse, startOfYesterday } = require('date-fns');
const mongo = require('../mongo-connect');
const audienceReport = require('./reports/audience-report');
const acquisitionReport = require('./reports/acquisition-report');
const testReport = require('./reports/test-report');

const COLLECTION = 'google-analytics';
const API_MAX_ROWS_PER_REQUEST = '10000';
const DEFAULT_PAGE_TOKEN = '0';

const getDateRanges = async (database) => {
  const results = await mongo.client.db(database)
    .collection(COLLECTION)
    .find()
    .project({'ga:date': 1})
    .sort({'ga:date':-1})
    .limit(1)
    .toArray();

  const minDate = !results.length
    ? parse('2019-01-01', 'yyyy-MM-dd', new Date()) // by default?
    : addDays(parse(results[0]['ga:date'], 'yyyyMMdd', new Date()), 1)
  ;

  const YESTERDAY = startOfYesterday();

  if (isSameDay(minDate, YESTERDAY)) {
    console.log('Google Analytics everything already retrieved.');
    return;
  }

  return [{
    startDate: format(minDate, 'yyyy-MM-dd'),
    // endDate: format(addDays(minDate, 1), 'yyyy-MM-dd'),
    endDate: 'yesterday'
  }];
};

module.exports = async ({database, viewId}) => {
  try {
    const results = [];

    const dateRanges = await getDateRanges(database);
    
    console.log(
      '[Google Analytics] data request: from %s.',
      dateRanges[0].startDate
    );

    let reports = [audienceReport,acquisitionReport/* , testReport */];

    let reportRequests = reports.map(report => report(
      viewId,
      dateRanges,
      DEFAULT_PAGE_TOKEN,
      API_MAX_ROWS_PER_REQUEST
    ));

    // await googleAuth.authorize();

    do {
      const reportResponses = await gaAPI.batchGet({
        auth: googleAuth.jwtClient,
        resource: {reportRequests}
      });

      console.log(
        '[Google Analytics] reports retrieved: %d.',
        reportResponses.length
      );

      const data = reportResponses.filter(({rows}) => rows.length);

      if (!data) {
        console.log('[Google Analytics] no data');
        break;
      }

      const resultsFormatted = data.reduce(
        (acc, {headers, rows}) => {
          const rowsFormatted = rows.map(
            row => row.reduce(
              (acc, val, index) => ({...acc, [headers[index]]: val}),
              {}
            )
          );

          return [...acc, ...rowsFormatted];
        },
        []
      );

      results.push(...resultsFormatted);

      ({reports, reportRequests} = reports.reduce(
        (acc, report, index) => (reportResponses[index].nextPageToken
          ? {
            ...acc,
            reports: [...acc.reports, report],
            reportRequests: [...acc.reportRequests, report(viewId, dateRanges, reportResponses[index].nextPageToken)]
          }
          : acc),
        {reports: [], reportRequests: []}
      ));
    } while (reportRequests.length);

    if (!results.length) {
      console.log('[Google Analytics] no results.');
      return;
    }

    console.log('[Google Analytics] writing %d operations.', results.length);

    const {upsertedCount, modifiedCount} = await mongo.client.db(database)
      .collection(COLLECTION)
      .bulkWrite(
        results.map((result) => ({
          updateOne: {
            filter: {
              'ga:date' : result['ga:date'],
              'ga:campaign' : result['ga:campaign']
            },
            update: { $set: result },
            upsert: true
          }
        }))
      );

    console.log(
      '[Google Analytics] rows upserted/updated: %d/%d.',
      upsertedCount,
      modifiedCount
    );
  } catch (error) {
    console.log('\x1b[31m[Google Analytics] reports ERROR: %s\x1b[0m', error);
  } finally {
    console.log('[Google Analytics] end');
  }
};
