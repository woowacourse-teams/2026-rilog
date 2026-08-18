import { HTTPError, TimeoutError } from 'ky';

import type { ErrorDetail } from '@/shared/api/shared.types';

import { getApiErrorKind } from './error-codes';

export type NormalizedApiError =
	| {
			kind: 'api';
			detail: ErrorDetail;
			category: ReturnType<typeof getApiErrorKind>;
			response: Response;
	  }
	| { kind: 'http'; response: Response; cause: HTTPError }
	| { kind: 'timeout'; cause: TimeoutError }
	| { kind: 'network'; cause: TypeError }
	| { kind: 'unknown'; cause: unknown };

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
				kind: 'api',
				detail: error.data,
				category: getApiErrorKind(error.data.errorCode),
				response: error.response,
			};
		}
		return { kind: 'http', response: error.response, cause: error };
	}

	if (error instanceof TimeoutError) {
		return { kind: 'timeout', cause: error };
	}

	if (error instanceof TypeError) {
		return { kind: 'network', cause: error };
	}

	return { kind: 'unknown', cause: error };
};

/**
 * NormalizedApiError에서 필드 오류(invalidParams)만 추출하여 폼 에러 형태(Record<string, string>)로 반환합니다.
 * 에러가 필드 오류가 아니거나 파라미터가 없으면 null을 반환합니다.
 */
export const getFieldErrors = (error: NormalizedApiError): Record<string, string> | null => {
	if (error.kind !== 'api' || error.category !== 'field' || !error.detail.invalidParams) {
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
