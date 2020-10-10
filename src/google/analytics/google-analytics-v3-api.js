const { google } = require('googleapis');

const ga = google.analytics('v3').data.ga;

const get = async (jwtClient, merchant) => {
  const result = await ga.get({
    'auth': jwtClient,
    'ids': `ga:${merchant.googleAnalytics.viewId}`,
    'start-date': '2019-01-01',
    'end-date': '2019-01-02',
    'metrics': 'ga:sessions, ga:users, ga:newUsers, ga:bounceRate',
    'dimensions': 'ga:week, ga:day, ga:month, ga:year, ga:source',
    'max-results': 1000000
});

  const headers = result.data.columnHeaders.map(header => header.name);

  const rows = result.data.rows;

  return {headers, rows};
};

module.exports = { get };
