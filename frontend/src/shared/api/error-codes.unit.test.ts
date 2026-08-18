import { describe, expect, it } from 'vitest';

import { API_ERROR_CODES, getApiErrorKind, isApiErrorCode } from './error-codes';

describe('API_ERROR_CODES', () => {
	it('문서화된 오류 코드를 UI 처리 범주로 매핑한다', () => {
		expect(getApiErrorKind(API_ERROR_CODES.REQUEST_VALIDATION_FAILED)).toBe('field');
		expect(getApiErrorKind(API_ERROR_CODES.EXPIRED_ACCESS_TOKEN)).toBe('authentication');
		expect(getApiErrorKind(API_ERROR_CODES.BLOG_MEMBER_INVITE_FORBIDDEN)).toBe('authorization');
		expect(getApiErrorKind(API_ERROR_CODES.POST_NOT_FOUND)).toBe('not-found');
		expect(getApiErrorKind(API_ERROR_CODES.SLUG_DUPLICATED)).toBe('conflict');
		expect(getApiErrorKind(API_ERROR_CODES.INTERNAL_SERVER_ERROR)).toBe('server');
	});

	it('알 수 없는 서버 오류 코드는 future-compatible하게 보존한다', () => {
		expect(isApiErrorCode('FUTURE_SERVER_ERROR')).toBe(false);
		expect(getApiErrorKind('FUTURE_SERVER_ERROR')).toBeUndefined();
	});
});
