import type { NormalizedApiError } from '@/shared/api/api-error';

export const isRetryableError = (error: unknown): boolean => {
	const apiError = error as NormalizedApiError;

	if (apiError.kind === 'network' || apiError.kind === 'timeout') {
		return true;
	}

	if (apiError.kind === 'http' || apiError.kind === 'api') {
		return apiError.response.status >= 500 && apiError.response.status < 600;
	}

	return false;
};

export const globalMutationErrorHandler = (error: Error, consoleError = console.error): void => {
	const apiError = error as unknown as NormalizedApiError;
	// REQUEST_VALIDATION_FAILED (필드 오류)는 지역(form) mutation onError에 위임합니다.
	if (apiError.kind === 'api' && apiError.category === 'field') {
		return;
	}

	// TODO: 공통 오류 처리기로 전달 (토스트/라우팅)
	consoleError('공통 오류 처리기 (Mutation):', apiError);
};
