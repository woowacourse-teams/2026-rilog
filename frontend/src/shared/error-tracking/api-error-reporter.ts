import type { ApiErrorContext } from './api-error-policy';
import type { ErrorTracker, ErrorTrackerContext } from './error-tracker';

import { isNormalizedApiError, normalizeApiError } from '@/shared/api/api-error';
import { logNonProductionWarning } from '@/shared/utils/non-production-console';

import { shouldReportApiError } from './api-error-policy';

export const RATE_LIMIT_REPORT_INTERVAL_MS = 60_000;

export interface ApiErrorCaptureDecision {
	capture: boolean;
	level?: ErrorTrackerContext['level'];
}

export class ApiErrorReporter {
	private readonly handled = new WeakMap<object, ApiErrorCaptureDecision>();
	private readonly lastRateLimitReports = new Map<string, number>();

	constructor(
		private readonly tracker: ErrorTracker,
		private readonly now: () => number = Date.now,
	) {}

	private getHandled(error: unknown): ApiErrorCaptureDecision | undefined {
		if (typeof error !== 'object' || error === null) return undefined;
		const cause = isNormalizedApiError(error) ? error.cause : undefined;
		return (
			this.handled.get(error) ?? (typeof cause === 'object' && cause !== null ? this.handled.get(cause) : undefined)
		);
	}

	private markHandled(error: unknown, decision: ApiErrorCaptureDecision): void {
		if (typeof error === 'object' && error !== null) this.handled.set(error, decision);
	}

	private allowRateLimitReport(operation: string): boolean {
		const timestamp = this.now();
		const previous = this.lastRateLimitReports.get(operation);
		if (previous !== undefined && timestamp - previous < RATE_LIMIT_REPORT_INTERVAL_MS) return false;
		this.lastRateLimitReports.set(operation, timestamp);
		return true;
	}

	private decide(error: ReturnType<typeof normalizeApiError>, context: ApiErrorContext): ApiErrorCaptureDecision {
		const online = typeof navigator === 'undefined' || navigator.onLine !== false;
		if (!shouldReportApiError(error, context, online)) return { capture: false };
		const rateLimited = 'response' in error && error.response.status === 429;
		if (rateLimited && !this.allowRateLimitReport(context.operation)) return { capture: false };
		return {
			capture: true,
			level:
				rateLimited && ['query', 'mutation', 'content.load', 'unhandled'].includes(context.operation)
					? 'warning'
					: 'error',
		};
	}

	report(error: unknown, context: ApiErrorContext): void {
		try {
			if (error === undefined || error === null || this.getHandled(error)) return;
			const normalized = normalizeApiError(error);
			if (this.getHandled(normalized.cause)) return;
			const decision = this.decide(normalized, context);
			// 비핵심 경계가 제외한 오류는 복구 UI에서 추가로 판단할 수 있다.
			if (
				!decision.capture &&
				['query', 'mutation'].includes(context.operation) &&
				!('response' in normalized && normalized.response.status === 429)
			)
				return;
			if (decision.capture)
				this.tracker.captureException(normalized, { tags: { operation: context.operation }, level: decision.level });
			this.markHandled(error, decision);
			this.markHandled(normalized, decision);
			this.markHandled(normalized.cause, decision);
		} catch {
			logNonProductionWarning('API error reporting failed.');
		}
	}

	/** 자동 수집은 중복을 제거한다. 전송용으로 변환된 명시 보고는 이미 내린 판정을 유지한다. */
	getCaptureDecision(error: unknown, explicitCapture = false): ApiErrorCaptureDecision {
		const handled = this.getHandled(error);
		if (handled) return explicitCapture ? handled : { capture: false };
		if (explicitCapture || !isNormalizedApiError(error)) return { capture: true };
		const decision = this.decide(error, { operation: 'unhandled' });
		this.markHandled(error, decision);
		this.markHandled(error.cause, decision);
		return decision;
	}
}
