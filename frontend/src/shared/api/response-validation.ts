import type { ApiResponse } from './shared.types';

import { copyApiRequestDiagnostics } from './request-diagnostics';

export class InvalidApiResponseError extends Error {
	constructor(operation: string) {
		super(`Invalid API response: ${operation}`);
		this.name = 'InvalidApiResponseError';
	}
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export const isInvalidApiResponseError = (value: unknown): boolean =>
	value instanceof InvalidApiResponseError ||
	(isRecord(value) && value.type === 'unknown' && value.cause instanceof InvalidApiResponseError);

export const parseApiResponse = <T>(
	value: unknown,
	operation: string,
	isData: (value: unknown) => value is T,
): ApiResponse<T> & { data: T } => {
	if (
		!isRecord(value) ||
		typeof value.status !== 'number' ||
		!Number.isFinite(value.status) ||
		typeof value.message !== 'string' ||
		!isData(value.data)
	) {
		throw new InvalidApiResponseError(operation);
	}

	return value as unknown as ApiResponse<T> & { data: T };
};

export const parseApiJsonResponse = async <T>(
	response: Response,
	operation: string,
	isData: (value: unknown) => value is T,
): Promise<ApiResponse<T> & { data: T }> => {
	let value: unknown;
	try {
		value = await response.json();
	} catch (error) {
		const failure = error instanceof SyntaxError ? new InvalidApiResponseError(operation) : error;
		copyApiRequestDiagnostics(response, failure);
		throw failure;
	}
	try {
		return parseApiResponse(value, operation, isData);
	} catch (error) {
		copyApiRequestDiagnostics(response, error);
		throw error;
	}
};
