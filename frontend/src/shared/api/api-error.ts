import { HTTPError, TimeoutError } from 'ky';

import type { ErrorDetail } from './shared.types';

import { getApiErrorKind } from './error-codes';

export type NormalizedApiError =
	| {
			type: 'api';
			detail: ErrorDetail;
			kind: ReturnType<typeof getApiErrorKind>;
			response: Response;
	  }
	| { type: 'http'; response: Response; cause: HTTPError }
	| { type: 'timeout'; cause: TimeoutError }
	| { type: 'network'; cause: TypeError }
	| { type: 'unknown'; cause: unknown };

export const isErrorDetail = (value: unknown): value is ErrorDetail => {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const detail = value as Partial<ErrorDetail>;

	return (
		typeof detail.status === 'number' &&
		typeof detail.error === 'string' &&
		typeof detail.errorCode === 'string' &&
		typeof detail.message === 'string' &&
		(detail.invalidParams === null || Array.isArray(detail.invalidParams))
	);
};

export const normalizeApiError = (error: unknown): NormalizedApiError => {
	if (error instanceof HTTPError) {
		if (isErrorDetail(error.data)) {
			return {
				type: 'api',
				detail: error.data,
				kind: getApiErrorKind(error.data.errorCode),
				response: error.response,
			};
		}

		return { type: 'http', response: error.response, cause: error };
	}

	if (error instanceof TimeoutError) {
		return { type: 'timeout', cause: error };
	}

	if (error instanceof TypeError) {
		return { type: 'network', cause: error };
	}

	return { type: 'unknown', cause: error };
};

export const isNotFoundApiError = (error: unknown): error is Extract<NormalizedApiError, { response: Response }> =>
	typeof error === 'object' &&
	error !== null &&
	'response' in error &&
	error.response instanceof Response &&
	error.response.status === 404;

/**
 * NormalizedApiError에서 필드 오류(invalidParams)만 추출하여 폼 에러 형태(Record<string, string>)로 반환합니다.
 * 에러가 필드 오류가 아니거나 파라미터가 없으면 null을 반환합니다.
 */
export const getFieldErrors = (error: NormalizedApiError): Record<string, string> | null => {
	if (error.type !== 'api' || error.kind !== 'field' || !error.detail.invalidParams) {
		return null;
	}

	const fieldErrors: Record<string, string> = {};
	for (const param of error.detail.invalidParams) {
		if (param.name) {
			fieldErrors[param.name] = param.reason;
		}
	}

	return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
};

export const getApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
	if (
		typeof error === 'object' &&
		error !== null &&
		'type' in error &&
		error.type === 'api' &&
		'detail' in error &&
		isErrorDetail(error.detail)
	) {
		return error.detail.message;
	}

	return error instanceof Error ? error.message : fallbackMessage;
};
