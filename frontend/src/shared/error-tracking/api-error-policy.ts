import type { NormalizedApiError } from '@/shared/api/api-error';

export interface ApiErrorContext {
	operation: string;
	oauthCancelled?: boolean;
}

/** Report final failures; leave routine user and authentication outcomes out of the issue feed. */
export function shouldReportApiError(error: NormalizedApiError, context: ApiErrorContext): boolean {
	if (context.oauthCancelled) return false;
	if (error.cause instanceof Error && error.cause.name === 'AbortError') return false;
	if (typeof navigator !== 'undefined' && navigator.onLine === false && error.type === 'network') return false;
	if (error.type === 'network' || error.type === 'timeout' || error.type === 'unknown') return true;
	const status = error.response.status;
	if (status >= 500 || status === 429) return true;
	if (context.operation === 'upload.put' && error.type === 'http' && (status === 403 || status === 404)) return true;
	if (error.type === 'api') {
		if (error.detail.errorCode.endsWith('NOT_FOUND') || error.detail.errorCode === 'INVALID_OAUTH_STATE') return false;
		if (['REQUEST_VALIDATION_FAILED', 'INVALID_SLUG', 'INVALID_COMMENT_CONTENT'].includes(error.detail.errorCode))
			return false;
		if (status === 401 || status === 403 || status === 404 || status === 409) return false;
		return true;
	}
	return ![401, 403, 404, 409].includes(status);
}
