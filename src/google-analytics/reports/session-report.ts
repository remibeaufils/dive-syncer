export default (view_id, dateRanges, landingPagePath, pageToken, pageSize?) => {
    return {
        viewId: `${view_id}`,
        dateRanges,
        // filtersExpression: 'ga:landingPagePath=~/products/.*$',
        filtersExpression: `ga:landingPagePath=~${landingPagePath}.*$`,
        hideTotals: true,
        hideValueRanges: true,
        pageToken,
        pageSize,
        metrics: [{ expression: 'ga:sessions' }],
        // dimensions: [{ name: 'ga:date' }, { name: 'ga:landingPagePath' }],
        dimensions: [{ name: 'ga:date' }],
    };
};
