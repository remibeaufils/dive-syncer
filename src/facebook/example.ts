// https://developers.facebook.com/apps/810256299552408/dashboard/?business_id=419757179433482

// https://developers.facebook.com/docs/business-sdk/getting-started
// https://github.com/facebook/facebook-nodejs-business-sdk
import bizSdk from 'facebook-nodejs-business-sdk';

// const access_token = '{access-token}';
// const account_id = 'act_{{adaccount-id}}';

// https://developers.facebook.com/apps/810256299552408/marketing-api/tools/?business_id=419757179433482
const access_token =
    'EAALg7H7pbpgBAKjJv7j8C3XM4RpGdsjKRfZCnGixZCsMFUkyPZA7ZBtpOzgYQI631gaOwgKZAueeOqABJqVRHYsglq2lUB98pwbO9K4ZANKg2CiKTMsQkUmmt1ijGqqpKuHHTKqCpXYZASa3SvcZAWQUygZCE4WCclX6Xwb0XcMnNGktr49tPcHFBqfQwZBIZC23cit8aEAhOgTEQZDZD';

const account_id = 'act_1094221174070759';

const FacebookAdsApi = bizSdk.FacebookAdsApi.init(access_token);

const AdAccount = bizSdk.AdAccount;
const Campaign = bizSdk.Campaign;

const account = new AdAccount(account_id);
console.log(account.id); // fields can be accessed as properties
let campaigns;

account
    .read([AdAccount.Fields.name /* , AdAccount.Fields.age */])
    .then((account) => {
        // console.log(account);
        return account.getCampaigns([Campaign.Fields.name], { limit: 10 }); // fields array and params
    })
    .then((result) => {
        // console.log(result.length);
        campaigns = result;
        campaigns.forEach((campaign) => console.log(campaign.name));
    })
    .catch(console.error);

// ---
// https://developers.facebook.com/docs/marketing-api/insights
// https://mixedanalytics.com/knowledge-base/import-facebook-ad-data-to-google-sheets

// curl -G \
// -d "date_preset=last_7d" \
// -d "access_token=EAALg7H7pbpgBAB9P7gQmVZAXT5EZB7oRZBcn4PdXqSydiNaJJr35PU10tXSkMqrXwedyWIfqPZCZBQZAAu4ZBkPrIxaViRRLUnr9ynUAWTO1kKO3lXzwM27iifIc2KdPdyNvLKlTlDL73NYm3Sb2Gcjpunn1XuCLFdiAykAwBw4EQZDZD" \
// "https://graph.facebook.com/v9.0/act_1094221174070759/insights?fields=reach,impressions,clicks,cpc,spend&time_increment=1"

// https://graph.facebook.com/v9.0/act_1094221174070759/insights?fields=clicks,cpc,spend&access_token=EAALg7H7pbpgBAB9P7gQmVZAXT5EZB7oRZBcn4PdXqSydiNaJJr35PU10tXSkMqrXwedyWIfqPZCZBQZAAu4ZBkPrIxaViRRLUnr9ynUAWTO1kKO3lXzwM27iifIc2KdPdyNvLKlTlDL73NYm3Sb2Gcjpunn1XuCLFdiAykAwBw4EQZDZD

// AQD9o1V9ZGZmP4d40aIBc_s_myyTVxxUO3zshGqWuTp_rENyURzdMtpMag9dNQFDktaWXLChFpJXHsQHAkLaYKLiV-hJbC8vN6GJ_SPKAGXTB8tZWDcaflRjA-Zx_I1SBQ9ZxFD0MRzeIZbXvAJ0q8L_9UeFlTw4UauU1p__8wXPmOlbf48WVInh-yafmjbyZTMAzi_yovKows5y4S2hk-aZkNBMfbVPFU63SrbUj3iFLJjLcOv8bVYoHBNxk144TNd6oAKpzuWFMeAkInyy-sY9LtrsdW4q40Chy-XFUMAJcRyeKHYK_vPT4-AVZGwbMobJdzuoAFiJ2Ul0LLX2FPvIyA1B74NCbk-kkQxvaHJdbA#_=_

// http://localhost:3000/api/facebook/callback?#access_token=EAAF8ajwP0sABACDfKJS8NikfA5SdiWRUuhXu4Kq1llMKaXOAuREZAR3YFI0cgit8p8QNKKpfWRq4VyAMWI7bxwY8pKWoRkzZAfWP7mCwUThwwlEAymCN8gAxUn9bGUWdldZCkjAHZCzQ6ToCkl17JE3SFXPil818n8qs04jPHvGjkehkpFYOrSjh1vtzRf4ZD&data_access_expiration_time=1618261214&expires_in=7185

// https://graph.facebook.com/v9.0/act_257340071369399/insights?fields=account_id,account_name,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,account_currency,reach,impressions,clicks,cpc,spend&level=ad&time_increment=1&time_range={"since":"2017-01-01","until":"2017-05-15"}&access_token=EAAF8ajwP0sABAPuvm5O49KQMyM1m8Pipl1h0H7TeCLcBEYVJJGVsW3MjFZAWoPZBQFSXWCyUu6Bxzij6JbeK4ZB6n2YwoY1raYX6K7051EnMHZBJ5fqWl8MUAr8CWpFXuDAxD5ikfZCtlXamQaDsk2cfSUFYY5dgoKfGXG2gdVwZDZD
