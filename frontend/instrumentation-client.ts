import * as Sentry from '@sentry/nextjs';

import { initializeSentry } from '@/shared/error-tracking/initialize-sentry';
import { notifySlackFromBrowser } from '@/shared/error-tracking/sentry-slack-alert';
import { getAnalyticsSessionReplayUrl, initializeAnalytics } from '@/shared/analytics/posthog';

initializeAnalytics();
initializeSentry({ getSessionReplayUrl: getAnalyticsSessionReplayUrl, onSlackAlert: notifySlackFromBrowser });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
