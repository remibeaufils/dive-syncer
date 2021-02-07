import { google } from 'googleapis';

const management = google.analytics('v3').management;

const getAccounts = async (googleAuth) => {
    const response = await management.accounts.list({
        auth: googleAuth.jwtClient,
    });

    return response.data.items;
};

const getProfile = async (googleAuth) => {
    // const response = await management.profiles.list({
    //   auth: googleAuth.jwtClient,
    //   accountId: '121455691',
    //   webPropertyId: '~all',
    // });

    // if (!response || !response.data || !response.data.items) return null;

    // const profile = response.data.items.find(({ id }) => id === '177707398');

    const response = await management.profiles.get({
        auth: googleAuth.jwtClient,
        accountId: '121455691',
        webPropertyId: 'UA-121455691-1',
        profileId: '177707398',
    });

    const profile = response.data;
    // const { currency, timezone } = profile;

    return profile;
};

export { getAccounts, getProfile };
