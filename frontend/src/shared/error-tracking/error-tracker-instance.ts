import type { ErrorTracker } from './error-tracker';

import { createSentryErrorTracker } from './sentry-error-tracker';

export const sentryErrorTracker = createSentryErrorTracker();
export const errorTracker: ErrorTracker = sentryErrorTracker;
