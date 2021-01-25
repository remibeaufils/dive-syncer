module.exports = (view_id, dateRanges, pageToken, pageSize) => ({
  viewId: `${view_id}`,
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
    // {name: 'ga:campaign'},
  ],
  hideTotals: true,
  hideValueRanges: true,
  pageToken,
  pageSize
});
