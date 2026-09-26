import type { ErrorTracker } from './error-tracker';

import { createSentryErrorTracker } from './sentry-error-tracker';

export const errorTracker: ErrorTracker = createSentryErrorTracker();
