import { describe, expect, it } from 'vitest';

import { API_ERROR_CODES, getApiErrorKind, isApiErrorCode } from './error-codes';

describe('API_ERROR_CODES', () => {
	it('문서화된 오류 코드를 UI 처리 범주로 매핑한다', () => {
		expect(getApiErrorKind(API_ERROR_CODES.REQUEST_VALIDATION_FAILED)).toBe('field');
		expect(getApiErrorKind(API_ERROR_CODES.EXPIRED_ACCESS_TOKEN)).toBe('authentication');
		expect(getApiErrorKind(API_ERROR_CODES.BLOG_MEMBER_INVITE_FORBIDDEN)).toBe('authorization');
		expect(getApiErrorKind(API_ERROR_CODES.USER_COLOG_COUNT_EXCEEDED)).toBe('request');
		expect(getApiErrorKind(API_ERROR_CODES.POST_NOT_FOUND)).toBe('not-found');
		expect(getApiErrorKind(API_ERROR_CODES.SLUG_DUPLICATED)).toBe('conflict');
		expect(getApiErrorKind(API_ERROR_CODES.INTERNAL_SERVER_ERROR)).toBe('server');
	});

	it('알 수 없는 서버 오류 코드는 future-compatible하게 보존한다', () => {
		expect(isApiErrorCode('FUTURE_SERVER_ERROR')).toBe(false);
		expect(getApiErrorKind('FUTURE_SERVER_ERROR')).toBeUndefined();
	});

	it.each([
		['INVALID_CHAPTER_NAME', 'field'],
		['INVALID_COMMENT_CONTENT', 'field'],
		['BLOG_MEMBER_DOESNT_NOT_BELONG', 'authorization'],
		['COLOG_SELF_REMOVE_FORBIDDEN', 'authorization'],
		['DRAFT_NOT_FOUND', 'not-found'],
		['DUPLICATED_PUBLISH', 'conflict'],
		['DUPLICATE_KEY_CONFLICT', 'conflict'],
		['COLOG_MEMBER_COUNT_EXCEEDED', 'request'],
		['INVALID_POST_CONTENT', 'request'],
		['INVALID_COMMENT_ANCHOR', 'request'],
		['INVALID_S3_URL_SCHEME', 'request'],
		['DATA_INTEGRITY_VIOLATION', 'server'],
	])('백엔드 오류 %s를 HTTP 숫자가 아닌 의미에 맞는 %s로 분류한다', (code, kind) => {
		expect(isApiErrorCode(code)).toBe(true);
		expect(getApiErrorKind(code)).toBe(kind);
	});

	it.each(['toString', 'constructor', '__proto__'])('계약에 없는 %s를 알려진 오류로 취급하지 않는다', (code) => {
		expect(isApiErrorCode(code)).toBe(false);
		expect(getApiErrorKind(code)).toBeUndefined();
	});
});
