import { HTTPError, TimeoutError } from 'ky';
import { describe, expect, it, vi } from 'vitest';

import { normalizeApiError } from '@/shared/api/api-error';
import { InvalidApiResponseError } from '@/shared/api/response-validation';

import { globalMutationErrorHandler, isRetryableError } from './query-client-config';

const createHttpError = (status: number) =>
	new HTTPError(
		new Response(null, { status }),
		new Request('https://api.rilog.test/v1/posts'),
		{} as ConstructorParameters<typeof HTTPError>[2],
	);

describe('isRetryableError', () => {
	it('네트워크나 타임아웃 에러는 재시도 가능하다고 판단한다', () => {
		expect(isRetryableError({ type: 'network', cause: new TypeError() })).toBe(true);
		expect(isRetryableError(normalizeApiError(new TimeoutError(new Request('https://api.rilog.test'))))).toBe(true);
	});

	it('5xx HTTP 에러는 재시도 가능하다고 판단한다', () => {
		expect(isRetryableError(normalizeApiError(createHttpError(502)))).toBe(true);
	});

	it('검증 오류와 5xx가 아닌 API 에러는 재시도하지 않는다', () => {
		expect(isRetryableError(normalizeApiError(new InvalidApiResponseError('posts.detail')))).toBe(false);
		expect(isRetryableError(normalizeApiError(createHttpError(400)))).toBe(false);
	});
});

describe('globalMutationErrorHandler', () => {
	it('category가 field인 API 에러는 전역 처리기를 우회한다', () => {
		const mockConsoleError = vi.fn();
		const httpError = createHttpError(400);
		httpError.data = {
			status: 400,
			error: 'Bad Request',
			errorCode: 'REQUEST_VALIDATION_FAILED',
			message: '잘못된 입력',
			invalidParams: [{ name: 'title', reason: '필수' }],
		};
		const error = normalizeApiError(httpError) as unknown as Error;

		globalMutationErrorHandler(error, mockConsoleError);

		expect(mockConsoleError).not.toHaveBeenCalled();
	});

	it('field가 아닌 다른 에러는 전역 오류 처리기를 실행한다', () => {
		const mockConsoleError = vi.fn();
		const error = {
			type: 'api',
			kind: 'auth',
		} as unknown as Error;

		globalMutationErrorHandler(error, mockConsoleError);

		expect(mockConsoleError).toHaveBeenCalledWith('공통 오류 처리기 (Mutation):', error);
	});

	it('프로덕션에서는 field가 아닌 에러도 console에 출력하지 않는다', () => {
		vi.stubEnv('NODE_ENV', 'production');
		const mockConsoleError = vi.fn();
		const error = { type: 'network' } as unknown as Error;

		globalMutationErrorHandler(error, mockConsoleError);

		expect(mockConsoleError).not.toHaveBeenCalled();
		vi.unstubAllEnvs();
	});
});
