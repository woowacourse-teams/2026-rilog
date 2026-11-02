import * as Sentry from '@sentry/nextjs';

import { logNonProductionWarning } from '@/shared/utils/non-production-console';

import { shouldCaptureAutomaticError } from './api-error-reporter';
import { safePostHogReplayUrl } from './sentry-diagnostic-privacy';
import { resolveSentryEnvironment } from './sentry-environment';
import { filterSentryEvent, filterSentrySpan } from './sentry-privacy';

interface InitializeSentryOptions {
	runtime?: 'browser' | 'node' | 'edge';
	tracesSampleRate?: number;
	getSessionReplayUrl?: () => string | undefined;
}

export function initializeSentry(options: InitializeSentryOptions = {}): void {
	const { runtime = 'node', getSessionReplayUrl, ...sentryOptions } = options;
	const config = resolveSentryEnvironment({
		environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
		enabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED,
		dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
		siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
		browserOrigin: typeof window === 'undefined' ? undefined : window.location.origin,
	});
	try {
		Sentry.init({
			dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
			enabled: config.enabled,
			environment: config.environment,
			initialScope: { tags: { runtime } },
			sendDefaultPii: false,
			beforeSend: (event, hint) => {
				hint.attachments = [];
				if (!shouldCaptureAutomaticError(hint.originalException, event.tags?.report_source === 'api')) return null;
				const filtered = filterSentryEvent(event);
				try {
					const rawReplayUrl = getSessionReplayUrl?.();
					const sessionReplayUrl = rawReplayUrl ? safePostHogReplayUrl(rawReplayUrl) : null;
					if (sessionReplayUrl) {
						filtered.tags = { ...filtered.tags, 'PostHog Recording URL': sessionReplayUrl };
						filtered.contexts = {
							...filtered.contexts,
							posthog_session_replay: { url: sessionReplayUrl },
						};
					}
				} catch {
					logNonProductionWarning('PostHog session replay URL preparation failed.');
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
