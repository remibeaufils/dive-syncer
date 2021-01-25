module.exports = (view_id, dateRanges, pageToken, pageSize) => ({
  viewId: `${view_id}`,
  dateRanges,
  metrics: [
    // {expression: 'ga:users'},
    {expression: 'ga:sessions'},
    {expression: 'ga:bounceRate'},
    // {expression: 'ga:cohortSessionsPerUser'}
    {expression: 'ga:visits'},
  ],
  dimensions: [
    {name: 'ga:channelGrouping'},
    // {name: 'ga:yearWeek'},
    {name: 'ga:date'},
    // {name: 'ga:acquisitionTrafficChannel'},
    // {name: 'ga:campaign'}
  ],
  hideTotals: true,
  hideValueRanges: true,
  pageToken,
  pageSize
});
