import { google } from 'googleapis';

const reports = google.analyticsreporting('v4').reports;

const batchGet = async (params) => {
    // https://developers.google.com/analytics/devguides/reporting/core/v4/basics
    // https://ga-dev-tools.appspot.com/request-composer/

    const results: any[] = [];

    const response: any = await reports.batchGet(params);

    response.data.reports?.forEach((report) => {
        const headers = report.columnHeader.dimensions.concat(
            report.columnHeader.metricHeader.metricHeaderEntries.map(({ name }) => name),
        );

        const rows = !report.data.rows
            ? []
            : report.data.rows.map((row) => row.dimensions.concat(row.metrics[0].values));

        const nextPageToken = report.nextPageToken;

        results.push({ headers, rows, nextPageToken });
    });

    return results;
};

export { batchGet };
