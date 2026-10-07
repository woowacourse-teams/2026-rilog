import type { ApiErrorContext } from './api-error-policy';
import type { ErrorTracker } from './error-tracker';

import { isApiRequestError, normalizeApiError } from '@/shared/api/api-error';
import { getApiRequestDiagnostics } from '@/shared/api/request-diagnostics';
import { logNonProductionWarning } from '@/shared/utils/non-production-console';

import { shouldReportApiError } from './api-error-policy';

const reported = new WeakSet<object>();

export function shouldCaptureAutomaticError(error: unknown, explicitApiReport = false): boolean {
	if (explicitApiReport) return true;
	if (error instanceof Error && error.name === 'AbortError') return false;
	if (!isApiRequestError(error)) return true;
	if (typeof error === 'object' && error !== null && reported.has(error)) return false;
	const failure = normalizeApiError(error);
	if (typeof failure.cause === 'object' && failure.cause !== null && reported.has(failure.cause)) return false;
	return shouldReportApiError(failure, { operation: 'unhandled' });
}

export function createApiErrorReporter(tracker: ErrorTracker) {
	return {
		report(error: unknown, context: ApiErrorContext): void {
			try {
				if (typeof error === 'object' && error !== null && reported.has(error)) return;
				const failure = normalizeApiError(error);
				const original = failure.cause;
				if (typeof original === 'object' && original !== null && reported.has(original)) return;
				if (!shouldReportApiError(failure, context)) return;

				const tags: Record<string, string> = { report_source: 'api', operation: context.operation };
				const contexts: Record<string, Record<string, unknown>> = {};
				if ('response' in failure) {
					tags.http_status = String(failure.response.status);
					const requestId = failure.response.headers.get('X-Request-ID');
					if (requestId) tags.request_id = requestId;
				}
				if (failure.type === 'api') {
					tags.error_code = failure.detail.errorCode;
					contexts.api_response = {
						status: failure.response.status,
						error_code: failure.detail.errorCode,
						message: failure.detail.message,
						invalid_params: failure.detail.invalidParams?.map((param) => param.name),
					};
				}
				const request = getApiRequestDiagnostics(original);
				if (request) contexts.api_request = { method: request.method, url: request.url };
				tracker.captureException(original instanceof Error ? original : new Error('API request failed'), {
					tags,
					contexts,
				});
				if (typeof error === 'object' && error !== null) reported.add(error);
				if (typeof original === 'object' && original !== null) reported.add(original);
			} catch {
				logNonProductionWarning('API error reporting failed.');
			}
		},
	};
}
