import * as Sentry from '@sentry/nextjs';

import { initializeSentry } from '@/shared/error-tracking/initialize-sentry';
import { initializeAnalytics } from '@/shared/analytics/posthog';

initializeSentry();
initializeAnalytics();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
