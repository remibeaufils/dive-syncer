module.exports = {
  id: 'r-pur-kercambre',
  merchantId: 'r-pur',
  database: 'r_pur',
  sources: [
    {
      name: 'shopify',
      privateApp: {
        key: '6aa559cf4c49848a097cb8f5c4dce309',
        password: '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'
      }
    },
    {
      name: 'googleAnalytics',
      viewId: 148074649,
    },
    /* {
      name: 'googleAdwords'
    },
    {
      name: 'facebook'
    } */
  ]
};
