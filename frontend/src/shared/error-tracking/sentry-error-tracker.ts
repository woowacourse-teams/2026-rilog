import * as Sentry from '@sentry/nextjs';

import type { ErrorTracker, ErrorTrackerContext } from './error-tracker';

import { logNonProductionWarning } from '@/shared/utils/non-production-console';

function captureWithContext(capture: () => void, context?: ErrorTrackerContext): void {
	if (!context) {
		capture();
		return;
	}

	Sentry.withScope((scope) => {
		if (context.level) scope.setLevel(context.level);
		for (const [key, value] of Object.entries(context.tags ?? {})) scope.setTag(key, value);
		for (const [key, value] of Object.entries(context.contexts ?? {})) scope.setContext(key, value);
		if (context.extra) scope.setExtras(context.extra);
		capture();
	});
}

export class SentryErrorTracker implements ErrorTracker {
	captureException(error: unknown, context?: ErrorTrackerContext): void {
		try {
			captureWithContext(() => Sentry.captureException(error), context);
		} catch {
			logNonProductionWarning('Sentry exception capture failed.');
		}
	}

	captureMessage(message: string, context?: ErrorTrackerContext): void {
		try {
			captureWithContext(() => Sentry.captureMessage(message), context);
		} catch {
			logNonProductionWarning('Sentry message capture failed.');
		}
	}

	setUser(userId: string | null): void {
		try {
			Sentry.setUser(userId === null ? null : { id: userId });
		} catch {
			logNonProductionWarning('Sentry user update failed.');
		}
	}
}

export function createSentryErrorTracker(): SentryErrorTracker {
	return new SentryErrorTracker();
}
