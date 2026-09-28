import * as Sentry from '@sentry/nextjs';

import type { ErrorTracker, ErrorTrackerContext } from './error-tracker';
import type { ApiErrorReport } from './sentry-api-error';
import type { ErrorEvent, EventHint } from '@sentry/nextjs';

import { isApiRequestError, normalizeApiError } from '@/shared/api/api-error';
import { logNonProductionWarning } from '@/shared/utils/non-production-console';

import { createApiErrorReport, sanitizeApiErrorEvent } from './sentry-api-error';

function toSentryContext(context?: ErrorTrackerContext) {
	return {
		extra: context?.extra,
		tags: context?.tags,
		...(context?.level ? { level: context.level } : {}),
	};
}

export class SentryErrorTracker implements ErrorTracker {
	private readonly reports = new WeakMap<object, ApiErrorReport>();
	private readonly captureSources = new WeakMap<Error, unknown>();

	/** 전송용 Error와 원본의 연결만 제공한다. 수집 정책은 reporter가 결정한다. */
	getCaptureSource(error: unknown): unknown {
		return error instanceof Error ? this.captureSources.get(error) : undefined;
	}

	captureException(error: unknown, context?: ErrorTrackerContext): void {
		try {
			if (isApiRequestError(error)) {
				const normalized = normalizeApiError(error);

				if (this.reports.has(error) || (normalized.cause instanceof Error && this.reports.has(normalized.cause))) {
					return;
				}

				const report = createApiErrorReport(normalized, context?.tags?.operation);
				this.reports.set(report.error, report);
				this.reports.set(error, report);

				if (normalized.cause instanceof Error) {
					this.reports.set(normalized.cause, report);
				}
				this.captureSources.set(report.error, normalized);

				Sentry.captureException(report.error, {
					tags: report.tags,
					...(context?.level ? { level: context.level } : {}),
				});
			} else {
				Sentry.captureException(error, toSentryContext(context));
			}
		} catch {
			logNonProductionWarning('Sentry exception capture failed.');
		}
	}

	captureMessage(message: string, context?: ErrorTrackerContext): void {
		try {
			Sentry.captureMessage(message, toSentryContext(context));
		} catch {
			logNonProductionWarning('Sentry message capture failed.');
		}
	}

	beforeSend = (event: ErrorEvent, hint: EventHint): ErrorEvent => {
		const original = hint.originalException;
		const report = isApiRequestError(original)
			? createApiErrorReport(normalizeApiError(original), 'unhandled')
			: original instanceof Error
				? this.reports.get(original)
				: undefined;

		return report ? sanitizeApiErrorEvent(event, report) : event;
	};
}

export function createSentryErrorTracker(): SentryErrorTracker {
	return new SentryErrorTracker();
}
