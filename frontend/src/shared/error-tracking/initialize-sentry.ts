import * as Sentry from '@sentry/nextjs';

import type { ErrorEvent, EventHint } from '@sentry/nextjs';

import { logNonProductionWarning } from '@/shared/utils/non-production-console';

import { apiErrorReporter } from './api-error-reporter-instance';
import { sentryErrorTracker } from './error-tracker-instance';

interface InitializeSentryOptions {
	tracesSampleRate?: number;
}

/** SDK 연결 지점: 정책/중복 판정은 reporter, 안전한 이벤트 변환은 tracker가 담당한다. */
function beforeSendApiError(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
	const source = sentryErrorTracker.getCaptureSource(hint.originalException);
	const decision = apiErrorReporter.getCaptureDecision(source ?? hint.originalException, source !== undefined);

	if (!decision.capture) return null;

	return sentryErrorTracker.beforeSend({ ...event, ...(decision.level ? { level: decision.level } : {}) }, hint);
}

export function initializeSentry(options: InitializeSentryOptions = {}): void {
	const isProduction = process.env.NODE_ENV === 'production';

	try {
		Sentry.init({
			dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
			enabled: isProduction || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
			environment: isProduction ? 'prod' : 'local',
			sendDefaultPii: false,
			beforeSend: beforeSendApiError,
			...options,
		});
	} catch {
		logNonProductionWarning('Sentry initialization failed.');
	}
}
