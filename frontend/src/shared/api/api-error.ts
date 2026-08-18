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
	| { kind: 'timeout'; cause: TimeoutError }
	| { kind: 'network' | 'unknown'; cause: unknown };

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
	if (error instanceof HTTPError && isErrorDetail(error.data)) {
		return {
			kind: 'api',
			detail: error.data,
			category: getApiErrorKind(error.data.errorCode),
			response: error.response,
		};
	}

	if (error instanceof TimeoutError) {
		return { kind: 'timeout', cause: error };
	}

	if (error instanceof TypeError) {
		return { kind: 'network', cause: error };
	}

	return { kind: 'unknown', cause: error };
};
