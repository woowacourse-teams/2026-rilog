import * as Sentry from '@sentry/nextjs';

import { initializeSentry } from '@/shared/error-tracking/initialize-sentry';
import { getAnalyticsSessionReplayUrl, initializeAnalytics } from '@/shared/analytics/posthog';

initializeAnalytics();
initializeSentry({
	runtime: 'browser',
	getSessionReplayUrl: getAnalyticsSessionReplayUrl,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
