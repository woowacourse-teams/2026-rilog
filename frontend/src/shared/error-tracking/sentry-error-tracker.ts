import * as Sentry from '@sentry/nextjs';

import type { ErrorTracker, ErrorTrackerContext } from './error-tracker';
import type { ApiErrorReport } from './sentry-api-error';
import type { ErrorEvent, EventHint } from '@sentry/nextjs';

import { isNormalizedApiError } from '@/shared/api/api-error';
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
			if (isNormalizedApiError(error)) {
				if (this.reports.has(error) || (error.cause instanceof Error && this.reports.has(error.cause))) return;
				const report = createApiErrorReport(error, context?.tags?.operation);
				this.reports.set(report.error, report);
				this.reports.set(error, report);
				if (error.cause instanceof Error) this.reports.set(error.cause, report);
				this.captureSources.set(report.error, error);
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
		const report = isNormalizedApiError(original)
			? createApiErrorReport(original, 'unhandled')
			: original instanceof Error
				? this.reports.get(original)
				: undefined;
		return report ? sanitizeApiErrorEvent(event, report) : event;
	};
}

export function createSentryErrorTracker(): SentryErrorTracker {
	return new SentryErrorTracker();
}
