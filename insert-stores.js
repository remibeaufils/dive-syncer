// {
//     "id" : "facebookt-test-store",
//     "merchantId" : "facebookt-test-store",
//     "user" : "facebook@diveanalytics.co",
//     "connectors" : [ 
//         {
//             "id" : "facebook",
//             "token" : "EAALg7H7pbpgBAEWbTlDFeBcAgZCVFZCiT9gr9IRCjrGuqci6iL7BjgtCO3RhwyVcmQEmICrKhLrFsT9Bt0KBRPDZCitiGptXu89WHaDMEJSlqKBrsGcO0T6ZAm7bweG6ZCi8eJqgPPUQMr6VrVaQHWBe1GsTZBwj12Py1iPPhdA77yNH2hjjZC7Ylf5ZCrf8qYwZD",
//             "user" : {
//                 "name" : "Rémi Beaufils",
//                 "id" : "10224842946725477"
//             }
//         }
//     ]
// }

db.getCollection("stores").insertMany([
  {
    id: "r-pur",
    merchant_id: "r-pur",
    sources: [
      {
        name: "shopify",
        shop: {
          id: "7651590201",
          name: "R-PUR",
          currency: "EUR",
          iana_timezone: "Europe/Paris",
        },
        private_app: "https://46c13673b1e5d7906b0caab2f953a17c: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@boutique-masque-antipollution-r-pur.myshopify.com"
      },
      {
        name: "facebook",
        account_id: "act_2289750570730",
        access_token: "EAALg7H7pbpgBAEWbTlDFeBcAgZCVFZCiT9gr9IRCjrGuqci6iL7BjgtCO3RhwyVcmQEmICrKhLrFsT9Bt0KBRPDZCitiGptXu89WHaDMEJSlqKBrsGcO0T6ZAm7bweG6ZCi8eJqgPPUQMr6VrVaQHWBe1GsTZBwj12Py1iPPhdA77yNH2hjjZC7Ylf5ZCrf8qYwZD",
      },
      {
        "name": "googleAnalytics",
        "account_id": "121455691",
        "property_id": "UA-121455691-1",
        "view_id": "177707398",
        "currency": "EUR",
        "timezone": "Europe/Paris",
      },
    ]
  },
  {
    id: "r-pur-kercambre",
    merchant_id: "r-pur",
    sources: [
      {
        name: "shopify",
        shop: {
          id: "36614930569",
          name: "R-PUR  US",
          currency: "USD",
          iana_timezone: "America/New_York",
        },
        private_app: "https://6aa559cf4c49848a097cb8f5c4dce309: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@r-pur-kercambre.myshopify.com"
      },
    ]
  },
  {
    id: "r-pur-asia",
    merchant_id: "r-pur",
    sources: [
      {
        name: "shopify",
        shop: {
          id: "27842969686",
          name: "R-PUR  ASIA",
          currency: "USD",
          iana_timezone: "Asia/Seoul",
        },
        private_app: "https://f199793d3e76e3a5479091f14968cb3d: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@r-pur-asia.myshopify.com"
      },
    ]
  },
]);
