import type { NormalizedApiError } from '@/shared/api/api-error';
import { API_ERROR_CODES } from '@/shared/api/error-codes';

export interface ApiErrorContext {
	operation: string;
	oauthCancelled?: boolean;
	/** Observable failure boundary, not a claim about the root cause or affected user count. */
	userImpact?: 'load_failed' | 'load_failed_with_data' | 'action_failed' | 'save_failed';
}

export interface ApiErrorClassification {
	kind:
		| 'cancelled'
		| 'offline'
		| 'network'
		| 'timeout'
		| 'unknown'
		| 'disabled_operation'
		| 'server_response'
		| 'rate_limit'
		| 'storage_rejected'
		| 'expected_rejection'
		| 'validation'
		| 'unexpected_response';
	report: boolean;
}

/** Classify the observed failure; a network/timeout alone does not establish a server outage. */
export function classifyApiError(error: NormalizedApiError, context: ApiErrorContext): ApiErrorClassification {
	if (context.oauthCancelled || (error.cause instanceof Error && error.cause.name === 'AbortError'))
		return { kind: 'cancelled', report: false };
	if (typeof navigator !== 'undefined' && navigator.onLine === false && error.type === 'network')
		return { kind: 'offline', report: false };
	if (error.type === 'network' || error.type === 'timeout' || error.type === 'unknown')
		return { kind: error.type, report: true };
	const status = error.response.status;
	if (
		context.operation === 'post.view.register' &&
		error.type === 'api' &&
		status === 503 &&
		error.detail.errorCode === API_ERROR_CODES.POST_VIEW_REGISTRATION_DISABLED
	)
		return { kind: 'disabled_operation', report: false };
	if (status >= 500) return { kind: 'server_response', report: true };
	if (status === 429) return { kind: 'rate_limit', report: true };
	if (context.operation === 'upload.put' && error.type === 'http' && (status === 403 || status === 404))
		return { kind: 'storage_rejected', report: true };
	if (error.type === 'api') {
		if (error.detail.errorCode.endsWith('NOT_FOUND') || error.detail.errorCode === 'INVALID_OAUTH_STATE')
			return { kind: 'expected_rejection', report: false };
		if (['REQUEST_VALIDATION_FAILED', 'INVALID_SLUG', 'INVALID_COMMENT_CONTENT'].includes(error.detail.errorCode))
			return { kind: 'validation', report: false };
	}
	if ([401, 403, 404, 409].includes(status)) return { kind: 'expected_rejection', report: false };
	return { kind: 'unexpected_response', report: true };
}

/** Report final failures; preserve the existing exclusion policy. */
export function shouldReportApiError(error: NormalizedApiError, context: ApiErrorContext): boolean {
	return classifyApiError(error, context).report;
}
