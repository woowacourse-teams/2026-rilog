import * as Sentry from '@sentry/nextjs';

import { initializeSentry } from '@/shared/error-tracking/initialize-sentry';
import { notifySlackFromBrowser } from '@/shared/error-tracking/sentry-slack-alert';
import { initializeAnalytics } from '@/shared/analytics/posthog';

initializeSentry({ onSlackAlert: notifySlackFromBrowser });
initializeAnalytics();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
