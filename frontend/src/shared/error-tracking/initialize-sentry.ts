import * as Sentry from '@sentry/nextjs';

import { logNonProductionWarning } from '@/shared/utils/non-production-console';

import { shouldCaptureAutomaticError } from './api-error-reporter';
import { filterSentryEvent, filterSentrySpan } from './sentry-privacy';

interface InitializeSentryOptions {
	tracesSampleRate?: number;
}

export function initializeSentry(options: InitializeSentryOptions = {}): void {
	const isProduction = process.env.NODE_ENV === 'production';
	try {
		Sentry.init({
			dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
			enabled: isProduction || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
			environment: isProduction ? 'prod' : 'local',
			sendDefaultPii: false,
			beforeSend: (event, hint) => {
				hint.attachments = [];
				if (!shouldCaptureAutomaticError(hint.originalException, event.tags?.report_source === 'api')) return null;
				return filterSentryEvent(event);
			},
			beforeSendTransaction: (event, hint) => {
				hint.attachments = [];
				return filterSentryEvent(event);
			},
			beforeSendSpan: filterSentrySpan,
			beforeBreadcrumb: (breadcrumb) => (breadcrumb.category === 'console' ? null : breadcrumb),
			enableLogs: false,
			...options,
		});
	} catch {
		logNonProductionWarning('Sentry initialization failed.');
	}
}
