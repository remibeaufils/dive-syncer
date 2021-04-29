import { batchGet } from './api/google-analyticsreporting-v4-api';
import googleAuth from '../google-auth';
import { addDays, format } from 'date-fns';
import { toDate, utcToZonedTime } from 'date-fns-tz';
import mongo from '../mongo-connect';
import sessionReport from './reports/session-report';

const COLLECTION = 'google-analytics-product-session';
const API_MAX_ROWS_PER_REQUEST = '10000';
const DEFAULT_PAGE_TOKEN = '0';
const DEFAULT_MIN_DATE = '2021-01-01';

export default async (store, googleAnalytics) => {
    const product_handles = await mongo.client
        .db(process.env.MONGO_DATABASE)
        .collection('shopify-products')
        .aggregate([
            {
                $match: {
                    store_id: store.id,
                },
            },
            {
                $group: {
                    _id: { store_id: '$store_id', product_handle: '$product_handle' },
                },
            },
            {
                $lookup: {
                    from: 'google-analytics-product-session',
                    let: {
                        shopify_store_id: '$_id.store_id',
                        shopify_product_handle: '$_id.product_handle',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$store_id', '$$shopify_store_id'] },
                                        { $eq: ['$ga:landingPagePath', '$$shopify_product_handle'] },
                                    ],
                                },
                            },
                        },
                        {
                            $sort: {
                                'ga:date.date': -1,
                            },
                        },
                        {
                            $group: {
                                _id: '$ga:landingPagePath',
                                'ga:date': { $first: '$ga:date' },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                'ga:date': 1,
                            },
                        },
                    ],
                    as: 'google-analytics-product-session',
                },
            },
            {
                $project: {
                    _id: 0,
                    product_handle: '$_id.product_handle',
                    'google-analytics-product-session': 1,
                },
            },
        ])
        .toArray();

    const { timezone, view_id } = googleAnalytics;

    const MAXIMUM_REPORTS_PER_REQUEST = 5;
    const product_handles_sliced: any[] = [];
    const report_requests_sliced: any[] = [];

    for (let i = 0; i < Math.ceil(product_handles.length / MAXIMUM_REPORTS_PER_REQUEST); i++) {
        product_handles_sliced.push(
            product_handles
                .slice(i * MAXIMUM_REPORTS_PER_REQUEST, (i + 1) * MAXIMUM_REPORTS_PER_REQUEST)
                .map(({ product_handle }) => product_handle),
        );

        report_requests_sliced.push(
            product_handles
                .slice(i * MAXIMUM_REPORTS_PER_REQUEST, (i + 1) * MAXIMUM_REPORTS_PER_REQUEST)
                .map((product_handle) => {
                    const minDate = product_handle['google-analytics-product-session'].length
                        ? utcToZonedTime(
                              addDays(product_handle['google-analytics-product-session'][0]['ga:date'].date, 1),
                              product_handle['google-analytics-product-session'][0]['ga:date'].timezone,
                          )
                        : toDate(DEFAULT_MIN_DATE, { timeZone: timezone });

                    return sessionReport(
                        view_id,
                        {
                            startDate: format(minDate, 'yyyy-MM-dd'),
                            endDate: 'yesterday',
                        },
                        product_handle.product_handle,
                        DEFAULT_PAGE_TOKEN,
                        API_MAX_ROWS_PER_REQUEST,
                    );
                }),
        );
    }

    console.log(report_requests_sliced);

    return await Promise.all(
        report_requests_sliced.map((report_requests, index) =>
            sync(store, googleAnalytics, product_handles_sliced[index], report_requests),
        ),
    );
};

const sync = async (store, { timezone, view_id }, product_handles_sliced, reportRequests) => {
    try {
        const results: any[] = [];

        do {
            const reportResponses = await batchGet({
                auth: googleAuth.jwtClient,
                resource: { reportRequests },
            });

            console.log('[Google Analytics] reports retrieved: %d.', reportResponses.length);

            // const data = reportResponses.filter(({ rows }) => rows.length);

            // if (!data) {
            //     console.log('[Google Analytics] no data');
            //     break;
            // }
            const data = reportResponses;

            const resultsFormatted = data.reduce((acc, { headers, rows }, index) => {
                const product_handle = product_handles_sliced[index];

                const rowsFormatted = rows.map((row) =>
                    row.reduce(
                        (acc, value, index) => {
                            const key = headers[index];

                            const val = !['ga:date'].includes(key)
                                ? value
                                : {
                                      date: toDate(value, { timeZone: timezone }),
                                      timezone: timezone,
                                  };

                            return { ...acc, [key]: val };
                        },
                        { product_handle },
                    ),
                );

                return [...acc, ...rowsFormatted];
            }, []);

            results.push(...resultsFormatted);

            ({ product_handles_sliced, reportRequests } = product_handles_sliced.reduce(
                (acc, report, index) =>
                    reportResponses[index].nextPageToken
                        ? {
                              ...acc,
                              product_handles_sliced: [...acc.product_handles_sliced, report],
                              reportRequests: [
                                  ...acc.reportRequests,
                                  report(view_id, level, dateRanges, reportResponses[index].nextPageToken),
                              ],
                          }
                        : acc,
                { product_handles_sliced: [], reportRequests: [] },
            ));
        } while (reportRequests.length);

        if (!results.length) {
            console.log('[Google Analytics] no results.');
            return;
        }

        console.log('[Google Analytics] writing %d operations.', results.length);

        // const { upsertedCount, modifiedCount } = await mongo.client
        //     .db(process.env.MONGO_DATABASE)
        //     .collection(COLLECTION)
        //     .bulkWrite(
        //         results.map((result) => {
        //             let filter: any = {
        //                 store_id: store.id,
        //                 'ga:date': result['ga:date'],
        //                 'ga:campaign': result['ga:campaign'],
        //             };
        //             if (['adgroup'].includes(level)) {
        //                 result = {
        //                     ...result,
        //                     'ga:adGroup': result['ga:adGroup'],
        //                 };
        //                 filter = {
        //                     ...filter,
        //                     'ga:adGroup': result['ga:adGroup'],
        //                 };
        //             }
        //             return {
        //                 updateOne: {
        //                     filter,
        //                     update: { $set: { ...result, store_id: store.id, level } },
        //                     upsert: true,
        //                 },
        //             };
        //         }),
        //     );

        // console.log('[Google Analytics] rows upserted/updated: %d/%d.', upsertedCount, modifiedCount);
    } catch (error) {
        console.log('\x1b[31m[Google Analytics] reports ERROR: %s\x1b[0m', error);
    } finally {
        console.log('[Google Analytics] end');
    }
};
