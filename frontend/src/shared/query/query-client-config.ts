import type { NormalizedApiError } from '@/shared/api/api-error';
import { logNonProductionError } from '@/shared/utils/non-production-console';

export const isRetryableError = (error: unknown): boolean => {
	const apiError = error as NormalizedApiError;

	if (apiError.type === 'network' || apiError.type === 'timeout') {
		return true;
	}

	if (apiError.type === 'http' || apiError.type === 'api') {
		return apiError.response.status >= 500 && apiError.response.status < 600;
	}

	return false;
};

export const globalMutationErrorHandler = (error: Error, logError = logNonProductionError): void => {
	const apiError = error as unknown as NormalizedApiError;
	// REQUEST_VALIDATION_FAILED (필드 오류)는 지역(form) mutation onError에 위임합니다.
	if (apiError.type === 'api' && apiError.kind === 'field') {
		return;
	}
	if (process.env.NODE_ENV === 'production') {
		return;
	}

	// TODO: 공통 오류 처리기로 전달 (토스트/라우팅)
	logError('공통 오류 처리기 (Mutation):', apiError);
};
