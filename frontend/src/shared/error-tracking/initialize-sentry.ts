import * as Sentry from '@sentry/nextjs';

import type { ErrorEvent, EventHint } from '@sentry/nextjs';

import { logNonProductionWarning } from '@/shared/utils/non-production-console';

import { apiErrorReporter } from './api-error-reporter-instance';
import { sentryErrorTracker } from './error-tracker-instance';
import { sanitizeSentryError, sanitizeSentrySpan, sanitizeSentryTransaction } from './sentry-privacy';

function privacyContext() {
	return {
		environment: process.env.NODE_ENV === 'production' ? 'prod' : 'local',
		release: Sentry.getClient?.()?.getOptions().release ?? 'unversioned',
		pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
		userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
	};
}

interface InitializeSentryOptions {
	tracesSampleRate?: number;
}

/** SDK 연결 지점: 정책/중복 판정은 reporter, 안전한 이벤트 변환은 tracker가 담당한다. */
function beforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
	try {
		// 첨부파일은 이벤트 밖의 envelope 항목이므로 별도로 차단한다.
		hint.attachments = [];
		const source = sentryErrorTracker.getCaptureSource(hint.originalException);
		const decision = apiErrorReporter.getCaptureDecision(source ?? hint.originalException, source !== undefined);

		if (!decision.capture) return null;

		const context = privacyContext();
		const prepared = sentryErrorTracker.beforeSend(
			{ ...event, ...(decision.level ? { level: decision.level } : {}) },
			hint,
		);
		// API 변환이 request를 제거하기 전에 경로와 UA만 분류에 사용한다.
		return sanitizeSentryError({ ...prepared, request: event.request, transaction: event.transaction }, context);
	} catch {
		return null;
	}
}

export function initializeSentry(options: InitializeSentryOptions = {}): void {
	const isProduction = process.env.NODE_ENV === 'production';

	try {
		Sentry.init({
			dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
			enabled: isProduction || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
			environment: isProduction ? 'prod' : 'local',
			sendDefaultPii: false,
			beforeSend, // 수집할 예외 필터링
			beforeSendTransaction: (event, hint) => {
				try {
					hint.attachments = [];
					return sanitizeSentryTransaction(event, privacyContext()); // 수집되는 에ㅚ에
				} catch {
					return null;
				}
			},
			beforeSendSpan: sanitizeSentrySpan,
			enableLogs: false,
			...options,
		});
	} catch {
		logNonProductionWarning('Sentry initialization failed.');
	}
}
