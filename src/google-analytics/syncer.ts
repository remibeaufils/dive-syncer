import sync from './sync';
import syncSessionByLandingPage from './sync-session-by-landing-page';

export default async (store, googleAnalytics) => {
    // await sync(store, googleAnalytics);

    if (store.id === 'asphalte') {
        await syncSessionByLandingPage(store, googleAnalytics);
    }
};
