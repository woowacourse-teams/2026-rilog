import { afterEach, describe, expect, it, vi } from 'vitest';

import { normalizeApiError } from '@/shared/api/api-error';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { API_ERROR_CODES } from '@/shared/api/error-codes';
import { getApiRequestDiagnostics } from '@/shared/api/request-diagnostics';
import { createEmptyResponse, createUnauthorizedResponse } from '@/test/fixtures/api-response';

import { apiClient } from './client';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('apiClient', () => {
	it('네트워크 실패의 실제 API 요청을 오류와 연결하되 동적 경로는 치환한다', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
		let captured: unknown;
		try {
			await apiClient.get('v1/blogs/private/posts/42');
		} catch (error) {
			captured = error;
		}
		expect(getApiRequestDiagnostics(normalizeApiError(captured).cause)).toEqual({
			method: 'GET',
			endpoint: '/v1/blogs/[slug]/posts/[postId]',
			operation: 'post.read',
			target: 'api',
		});
	});
	it('HTTP 성공 뒤 JSON 파싱이 실패해도 원래 API 요청을 확인할 수 있다', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not-json', { status: 200 })));
		let captured: unknown;
		try {
			await apiClient.get('v1/blogs/private/posts/42');
		} catch (error) {
			captured = error;
		}
		expect(getApiRequestDiagnostics(normalizeApiError(captured).cause)).toMatchObject({
			endpoint: '/v1/blogs/[slug]/posts/[postId]',
			operation: 'post.read',
		});
	});
	it('설정된 API base URL을 사용하고 쿠키를 포함하는 전역 client를 제공한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(createEmptyResponse());
		vi.stubGlobal('fetch', fetchMock);

		await apiClient.get('posts');

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe('https://api.rilog.test/posts');
		expect(request.credentials).toBe('include');
	});

	it('token 갱신 실패를 구독자에게 알린다', async () => {
		vi.stubGlobal('window', {});
		const fetchMock = vi.fn().mockResolvedValue(createUnauthorizedResponse(API_ERROR_CODES.EXPIRED_ACCESS_TOKEN));
		vi.stubGlobal('fetch', fetchMock);
		const listener = vi.fn();
		const unsubscribe = tokenManager.subscribeLogout(listener);

		await expect(apiClient.get('posts')).rejects.toMatchObject({
			response: { status: 401 },
		});

		expect(listener).toHaveBeenCalledOnce();
		unsubscribe();
	});

	it('DELETE 응답은 JSON으로 파싱하지 않고 204 Response를 반환한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetchMock);

		const response = await apiClient.delete('v1/posts/42');

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('DELETE');
		expect(response.status).toBe(204);
	});
});
