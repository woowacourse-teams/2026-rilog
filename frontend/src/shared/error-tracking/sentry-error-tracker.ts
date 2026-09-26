import * as Sentry from '@sentry/nextjs';

import type { ErrorTracker, ErrorTrackerContext } from './error-tracker';

function toSentryContext(context?: ErrorTrackerContext) {
	return {
		extra: context?.extra,
		tags: context?.tags,
	};
}

export function createSentryErrorTracker(): ErrorTracker {
	return {
		captureException(error, context) {
			Sentry.captureException(error, toSentryContext(context));
		},
		captureMessage(message, context) {
			Sentry.captureMessage(message, toSentryContext(context));
		},
	};
}
