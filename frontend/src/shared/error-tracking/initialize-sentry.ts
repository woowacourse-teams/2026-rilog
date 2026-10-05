import * as Sentry from '@sentry/nextjs';

import { logNonProductionWarning } from '@/shared/utils/non-production-console';

import { shouldCaptureAutomaticError } from './api-error-reporter';
import { filterSentryEvent, filterSentrySpan } from './sentry-privacy';
import { summarizeSentryEventForSlack, type SentrySlackSummary } from './sentry-slack-summary';

interface InitializeSentryOptions {
	tracesSampleRate?: number;
	onSlackAlert?: (summary: SentrySlackSummary) => void;
}

export function initializeSentry(options: InitializeSentryOptions = {}): void {
	const isProduction = process.env.NODE_ENV === 'production';
	const { onSlackAlert, ...sentryOptions } = options;
	try {
		Sentry.init({
			dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
			enabled: isProduction || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
			environment: isProduction ? 'prod' : 'local',
			sendDefaultPii: false,
			beforeSend: (event, hint) => {
				hint.attachments = [];
				if (!shouldCaptureAutomaticError(hint.originalException, event.tags?.report_source === 'api')) return null;
				const filtered = filterSentryEvent(event);
				if (
					isProduction &&
					filtered.environment === 'prod' &&
					(!filtered.level || filtered.level === 'error' || filtered.level === 'fatal')
				) {
					try {
						const summary = summarizeSentryEventForSlack(filtered);
						if (summary) onSlackAlert?.(summary);
					} catch {
						logNonProductionWarning('Sentry Slack alert preparation failed.');
					}
				}
				return filtered;
			},
			beforeSendTransaction: (event, hint) => {
				hint.attachments = [];
				return filterSentryEvent(event);
			},
			beforeSendSpan: filterSentrySpan,
			beforeBreadcrumb: (breadcrumb) =>
				breadcrumb.category === 'console' &&
				(breadcrumb.message?.startsWith('[ky request]') || breadcrumb.message?.startsWith('[ky response]'))
					? null
					: breadcrumb,
			enableLogs: false,
			...sentryOptions,
		});
	} catch {
		logNonProductionWarning('Sentry initialization failed.');
	}
}
