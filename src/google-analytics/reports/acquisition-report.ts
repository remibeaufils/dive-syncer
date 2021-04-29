export default (view_id, level, dateRanges, pageToken, pageSize?) => {
    let dimensions = [
        { name: 'ga:date' },
        // {name: 'ga:currencyCode'},
        { name: 'ga:campaign' },
        // { name: 'ga:adGroup' },
        // { name: 'ga:adContent' },
        // { name: 'ga:adDisplayUrl' },
        // { name: 'ga:adDestinationUrl' },
        // {name: 'ga:yearMonth'},
        // {name: 'ga:week'},
        // {name: 'ga:day'},
        // {name: 'ga:month'},
        // {name: 'ga:year'},
        // {name: 'ga:source'}
        // {name: 'ga:adwordsCampaignID'}
    ];

    if (level === 'adgroup') {
        dimensions = [...dimensions, { name: 'ga:adGroup' }];
    }

    return {
        viewId: `${view_id}`,
        dateRanges,
        filtersExpression: 'ga:adwordsCampaignID!=(not set)',
        hideTotals: true,
        hideValueRanges: true,
        pageToken,
        pageSize,
        metrics: [
            { expression: 'ga:adCost' }, // , formattingType: 'CURRENCY'
            { expression: 'ga:transactions' },
            // {expression: 'ga:costPerTransaction'}, // = ga:adCost / ga:transactions
            // {expression: 'ga:adCost/ga:transactions', alias: 'ga:cpa', formattingType: 'float' },
            { expression: 'ga:transactionRevenue' },
            { expression: 'ga:ROAS' }, // = ga:transactionRevenue / ga:adCost * 100
            // { expression: 'ga:transactionRevenue/ga:adCost', alias: 'ga:roas', formattingType: 'float' },
            { expression: 'ga:impressions' },
            { expression: 'ga:CPM' }, // = ga:adCost / (ga:impressions / 1000)

            { expression: 'ga:adClicks' },
            { expression: 'ga:CPC' }, // = ga:adCost / ga:adClicks
            { expression: 'ga:CTR' },
            { expression: 'ga:costPerTransaction' },
        ],
        dimensions,
    };
};

// export default (view_id, dateRanges, pageToken, pageSize?) => ({
//     viewId: `${view_id}`,
//     dateRanges,
//     metrics: [
//         { expression: 'ga:adCost' }, // , formattingType: 'CURRENCY'

//         { expression: 'ga:transactions' },
//         // {expression: 'ga:costPerTransaction'}, // = ga:adCost / ga:transactions
//         // {expression: 'ga:adCost/ga:transactions', alias: 'ga:cpa', formattingType: 'float' },

//         { expression: 'ga:transactionRevenue' },
//         { expression: 'ga:ROAS' }, // = ga:transactionRevenue / ga:adCost * 100
//         // { expression: 'ga:transactionRevenue/ga:adCost', alias: 'ga:roas', formattingType: 'float' },

//         { expression: 'ga:impressions' },
//         { expression: 'ga:CPM' }, // = ga:adCost / (ga:impressions / 1000)

//         { expression: 'ga:adClicks' },
//         { expression: 'ga:CPC' }, // = ga:adCost / ga:adClicks
//         { expression: 'ga:CTR' },
//         { expression: 'ga:costPerTransaction' },
//     ],
//     dimensions: [
//         { name: 'ga:date' },
//         // {name: 'ga:currencyCode'},
//         { name: 'ga:campaign' },
//         // { name: 'ga:adGroup' },
//         // { name: 'ga:adContent' },
//         // { name: 'ga:adDisplayUrl' },
//         // { name: 'ga:adDestinationUrl' },
//         // {name: 'ga:yearMonth'},
//         // {name: 'ga:week'},
//         // {name: 'ga:day'},
//         // {name: 'ga:month'},
//         // {name: 'ga:year'},
//         // {name: 'ga:source'}
//         // {name: 'ga:adwordsCampaignID'}
//     ],
//     filtersExpression: 'ga:adwordsCampaignID!=(not set)',
//     hideTotals: true,
//     hideValueRanges: true,
//     pageToken,
//     pageSize,
// });
