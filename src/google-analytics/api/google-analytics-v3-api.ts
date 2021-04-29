import { google } from 'googleapis';

const management = google.analytics('v3').management;

const getAccounts = async (googleAuth) => {
    const response = await management.accounts.list({
        auth: googleAuth.jwtClient,
    });

    return response.data.items;
};

const getProfileList = async (googleAuth, accountId) => {
    // accountId = '121455691'

    const response = await management.profiles.list({
        auth: googleAuth.jwtClient,
        accountId,
        webPropertyId: '~all',
    });

    if (!response || !response.data || !response.data.items) return null;

    return response.data.items;
};

const getProfile = async (googleAuth, accountId, webPropertyId, profileId) => {
    // accountId = '121455691'
    // webPropertyId = 'UA-121455691-1'
    // profileId = '177707398'

    // const profile = profiles.find(({ id }) => id === '177707398');

    const response = await management.profiles.get({
        auth: googleAuth.jwtClient,
        accountId,
        webPropertyId,
        profileId,
    });

    const profile = response.data;
    // const { currency, timezone } = profile;

    return profile;
};

export { getAccounts, getProfileList, getProfile };
