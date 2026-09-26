import ky from 'ky';
import { describe, expect, it } from 'vitest';

import { normalizeApiError } from '@/shared/api/api-error';

import { shouldReportApiError } from './api-error-policy';

const apiError = async (code: string, status = 400, invalidParams: unknown = null) => {
	const error = await ky
		.get('https://api.test/failure', {
			retry: 0,
			fetch: () =>
				Promise.resolve(
					new Response(
						JSON.stringify({ status, error: 'error', errorCode: code, message: 'private message', invalidParams }),
						{ status, headers: { 'Content-Type': 'application/json' } },
					),
				),
		})
		.catch((original: unknown) => original);
	return normalizeApiError(error);
};

describe('API 오류 수집 우선순위', () => {
	it.each(['POST_NOT_FOUND', 'AUTHORIZATION_FAILED', 'DUPLICATED_PUBLISH'])(
		'핵심 발행에서도 정상 거부 %s는 제외한다',
		async (code) => {
			expect(shouldReportApiError(await apiError(code), { operation: 'post.publish' })).toBe(false);
		},
	);
	it.each([403, 404, 409, 429])('계약 밖 코드는 HTTP %s여도 수집한다', async (status) => {
		expect(shouldReportApiError(await apiError('NEW_CONTRACT_CODE', status), { operation: 'query' })).toBe(true);
	});
	it.each([
		'OAUTH_CALLBACK_PARAMETER_MISSING',
		'GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED',
		'GITHUB_USER_FETCH_FAILED',
		'OAUTH_REQUEST_FAILED',
	])('OAuth 처리 오류 %s를 수집한다', async (code) => {
		expect(shouldReportApiError(await apiError(code), { operation: 'oauth.callback' })).toBe(true);
	});
	it('확인한 동의 취소와 state 만료는 제외하지만 취소 중 발생한 5xx는 수집한다', async () => {
		expect(
			shouldReportApiError(await apiError('OAUTH_REQUEST_FAILED'), {
				operation: 'oauth.callback',
				oauthCancelled: true,
			}),
		).toBe(false);
		expect(shouldReportApiError(await apiError('INVALID_OAUTH_STATE'), { operation: 'oauth.callback' })).toBe(false);
		expect(
			shouldReportApiError(await apiError('INTERNAL_SERVER_ERROR', 500), {
				operation: 'oauth.callback',
				oauthCancelled: true,
			}),
		).toBe(true);
	});
	it('제목 입력 검증만 제외하고 누락한 제목·본문·혼합 오류는 수집한다', async () => {
		const title = { name: 'title', reason: '제목은 512자 이하여야 합니다.' };
		const context = { operation: 'draft.save', invalidUserInputFields: ['title'] } as const;
		expect(shouldReportApiError(await apiError('REQUEST_VALIDATION_FAILED', 400, [title]), context)).toBe(false);
		expect(
			shouldReportApiError(await apiError('REQUEST_VALIDATION_FAILED', 400, [title]), { operation: 'draft.save' }),
		).toBe(true);
		for (const fields of [
			null,
			[],
			[{ name: 'content', reason: '본문은 필수입니다.' }],
			[title, { name: 'content', reason: '본문은 필수입니다.' }],
		]) {
			expect(shouldReportApiError(await apiError('REQUEST_VALIDATION_FAILED', 400, fields), context)).toBe(true);
		}
	});
	it('서버 문구가 바뀌어도 확인된 입력 제약 위반의 판정은 바뀌지 않는다', async () => {
		expect(
			shouldReportApiError(
				await apiError('REQUEST_VALIDATION_FAILED', 400, [{ name: 'title', reason: 'Title is too long' }]),
				{ operation: 'draft.save', invalidUserInputFields: ['title'] },
			),
		).toBe(false);
	});
	it('취소·오프라인 통신 실패를 제외하지만 오프라인 상태의 프로그래밍 오류는 수집한다', () => {
		expect(
			shouldReportApiError(normalizeApiError(new DOMException('cancel', 'AbortError')), { operation: 'draft.save' }),
		).toBe(false);
		expect(shouldReportApiError(normalizeApiError(new TypeError('network')), { operation: 'draft.save' }, false)).toBe(
			false,
		);
		expect(shouldReportApiError(normalizeApiError(new Error('bug')), { operation: 'draft.save' }, false)).toBe(true);
	});
	it('S3 업로드의 403은 자사 API의 정상 권한 거부처럼 제외하지 않는다', async () => {
		expect(shouldReportApiError(await apiError('AUTHORIZATION_FAILED', 403), { operation: 'upload.put' })).toBe(true);
	});
});
