import * as Sentry from '@sentry/nextjs';

import type { ErrorTracker, ErrorTrackerContext } from './error-tracker';

import { isNormalizedApiError } from '@/shared/api/api-error';
import { logNonProductionWarning } from '@/shared/utils/non-production-console';

import { createApiErrorReport } from './sentry-api-error';

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
				if (isNormalizedApiError(error)) {
					const report = createApiErrorReport(error, context?.tags?.operation);
					Sentry.captureException(report.error, { tags: report.tags });
				} else {
					Sentry.captureException(error, toSentryContext(context));
				}
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
