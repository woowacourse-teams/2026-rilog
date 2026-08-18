import ky from 'ky';
import { describe, expect, it, vi } from 'vitest';

import { API_ERROR_CODES } from '@/shared/api/error-codes';

import { normalizeApiError } from './api-error';

describe('normalizeApiError', () => {
	it('서버 오류 본문을 코드와 처리 범주를 포함한 API 오류로 정규화한다', async () => {
		const client = ky.create({
			fetch: vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						status: 400,
						error: 'BAD_REQUEST',
						errorCode: API_ERROR_CODES.REQUEST_VALIDATION_FAILED,
						message: '요청 값 검증에 실패했습니다.',
						invalidParams: [{ name: 'slug', reason: '공백일 수 없습니다.' }],
					}),
					{ headers: { 'Content-Type': 'application/json' }, status: 400 },
				),
			),
		});

		const error = await client.get('https://api.rilog.test/posts').catch(normalizeApiError);

		expect(error).toMatchObject({
			kind: 'api',
			category: 'field',
			detail: { errorCode: API_ERROR_CODES.REQUEST_VALIDATION_FAILED, invalidParams: [{ name: 'slug' }] },
		});
	});

	it('응답이 없는 오류는 network 오류로 정규화한다', () => {
		expect(normalizeApiError(new TypeError('Failed to fetch'))).toMatchObject({ kind: 'network' });
	});

	it('ErrorDetail 규격을 따르지 않는 HTTP 에러(예: 502 Bad Gateway)는 http 오류로 정규화한다', async () => {
		const client = ky.create({
			fetch: vi.fn().mockResolvedValue(
				new Response('<html>502 Bad Gateway</html>', {
					headers: { 'Content-Type': 'text/html' },
					status: 502,
				}),
			),
		});

		const error = await client.get('https://api.rilog.test/posts').catch(normalizeApiError);

		expect(error).toMatchObject({
			kind: 'http',
		});
		if (error && typeof error === 'object' && 'response' in error) {
			expect(error.response.status).toBe(502);
		}
	});
});
