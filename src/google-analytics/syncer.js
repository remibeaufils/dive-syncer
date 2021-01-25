const analyticsReportingAPI = require('./api/google-analyticsreporting-v4-api');
const googleAuth = require('../google-auth');
const { addDays, format, isSameDay, parse, startOfToday } = require('date-fns');
const { toDate } = require('date-fns-tz');
const mongo = require('../mongo-connect');
const audienceReport = require('./reports/audience-report');
const acquisitionReport = require('./reports/acquisition-report');
const testReport = require('./reports/test-report');

const COLLECTION = 'google-analytics';
const API_MAX_ROWS_PER_REQUEST = '10000';
const DEFAULT_PAGE_TOKEN = '0';

const getDateRanges = async (store, timezone) => {
  const results = await mongo.client.db(process.env.MONGO_DATABASE)
    .collection(COLLECTION)
    .find({ store_id: store.id })
    .project({ 'ga:date': '$ga:date.date' })
    .sort({ 'ga:date': -1 })
    .limit(1)
    .toArray();

  const minDate = !results.length
    ? toDate('2018-01-01', { timeZone: timezone }) // Opening date of the store.
    : addDays(results[0]['ga:date'], 1)
  ;

  const TODAY = startOfToday();

  if (isSameDay(minDate, TODAY)) {
    console.log('Google Analytics everything already retrieved.');
    return;
  }

  return [{
    startDate: format(minDate, 'yyyy-MM-dd'),
    // endDate: format(addDays(minDate, 1), 'yyyy-MM-dd'),
    endDate: 'yesterday'
  }];
};

module.exports = async (store, { timezone, view_id }) => {
  try {
    const results = [];

    const dateRanges = await getDateRanges(store, timezone);

    if (!dateRanges) return;
    
    console.log(
      '[Google Analytics] data request: from %s.',
      dateRanges[0].startDate
    );

    let reports = [
      // audienceReport,
      acquisitionReport,
      // testReport,
    ];

    let reportRequests = reports.map(report => report(
      view_id,
      dateRanges,
      DEFAULT_PAGE_TOKEN,
      API_MAX_ROWS_PER_REQUEST
    ));

    // await googleAuth.authorize();

    do {
      const reportResponses = await analyticsReportingAPI.batchGet({
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
        (acc, { headers, rows }) => {
          const rowsFormatted = rows.map(
            row => row.reduce(
              (acc, value, index) => {
                const key = headers[index];

                const val =
                  ![
                    'ga:date',
                    'ga:dateHour',
                    'ga:dateHourMinute'
                  ].includes(key)
                    ? value
                    : {
                      date: toDate(value, { timeZone: timezone }),
                      timezone: timezone,
                    };

                return { ...acc, [key]: val };
              },
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
            reportRequests: [...acc.reportRequests, report(view_id, dateRanges, reportResponses[index].nextPageToken)]
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

    const {upsertedCount, modifiedCount} = await mongo.client
      .db(process.env.MONGO_DATABASE)
      .collection(COLLECTION)
      .bulkWrite(
        results.map((result) => ({
          updateOne: {
            filter: {
              store_id: store.id,
              'ga:date' : result['ga:date'],
              // 'ga:campaign' : result['ga:campaign']
            },
            update: { $set: { ...result, store_id: store.id } },
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
