import * as Sentry from '@sentry/nextjs';

import type { ErrorTracker, ErrorTrackerContext } from './error-tracker';

import { logNonProductionWarning } from '@/shared/utils/non-production-console';

function toSentryContext(context?: ErrorTrackerContext) {
	return {
		extra: context?.extra,
		tags: context?.tags,
	};
}

export function createSentryErrorTracker(): ErrorTracker {
	return {
		captureException(error, context) {
			try {
				Sentry.captureException(error, toSentryContext(context));
			} catch {
				logNonProductionWarning('Sentry exception capture failed.');
			}
		},
		captureMessage(message, context) {
			try {
				Sentry.captureMessage(message, toSentryContext(context));
			} catch {
				logNonProductionWarning('Sentry message capture failed.');
			}
		},
	};
}
