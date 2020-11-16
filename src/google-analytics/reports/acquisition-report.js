module.exports = (viewId, dateRanges, pageToken, pageSize) => ({
  viewId: `${viewId}`,
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
  hideTotals: true,
  hideValueRanges: true,
  pageToken,
  pageSize
});
