import { describe, expect, it, vi } from 'vitest';

import { globalMutationErrorHandler, isRetryableError } from './query-client-config';

describe('isRetryableError', () => {
	it('네트워크나 타임아웃 에러는 재시도 가능하다고 판단한다', () => {
		expect(isRetryableError({ type: 'network', cause: new TypeError() })).toBe(true);
		expect(isRetryableError({ type: 'timeout', cause: new Error() })).toBe(true);
	});

	it('5xx HTTP 에러는 재시도 가능하다고 판단한다', () => {
		expect(
			isRetryableError({
				type: 'http',
				response: { status: 502 },
				cause: new Error(),
			}),
		).toBe(true);
	});

	it('5xx가 아닌 API 에러는 재시도하지 않는다', () => {
		expect(
			isRetryableError({
				type: 'api',
				response: { status: 400 },
				kind: 'field',
			}),
		).toBe(false);
	});
});

describe('globalMutationErrorHandler', () => {
	it('category가 field인 API 에러는 전역 처리기를 우회한다', () => {
		const mockConsoleError = vi.fn();
		const error = {
			type: 'api',
			kind: 'field',
		} as unknown as Error;

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
});
