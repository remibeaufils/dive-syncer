module.exports = (view_id, dateRanges, pageToken, pageSize) => ({
  viewId: `${view_id}`,
  dateRanges,
  metrics: [
    {expression: 'ga:adCost'}, // , formattingType: 'CURRENCY'
    
    {expression: 'ga:transactions'},
    // {expression: 'ga:costPerTransaction'}, // = ga:adCost / ga:transactions
    // {expression: 'ga:adCost/ga:transactions', alias: 'ga:cpa', formattingType: 'float' },
    
    {expression: 'ga:transactionRevenue'},
    // {expression: 'ga:ROAS'}, // = ga:transactionRevenue / ga:adCost * 100
    // {expression: 'ga:transactionRevenue/ga:adCost', alias: 'ga:roas', formattingType: 'float' },

    // {expression: 'ga:impressions'},
    // {expression: 'ga:CPM'}, // = ga:adCost / (ga:impressions / 1000)
    
    // {expression: 'ga:adClicks'},
    // {expression: 'ga:CPC'}, // = ga:adCost / ga:adClicks
  ],
  dimensions: [
    {name: 'ga:date'},
    // {name: 'ga:currencyCode'},
    // {name: 'ga:campaign'},
    // {name: 'ga:yearMonth'},
    // {name: 'ga:week'},
    // {name: 'ga:day'},
    // {name: 'ga:month'},
    // {name: 'ga:year'},
    // {name: 'ga:source'}
    // {name: 'ga:adwordsCampaignID'}
  ],
  filtersExpression: 'ga:adwordsCampaignID!=(not set)',
  hideTotals: true,
  hideValueRanges: true,
  pageToken,
  pageSize
});
