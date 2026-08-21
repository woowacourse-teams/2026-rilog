import { afterEach, describe, expect, it, vi } from 'vitest';

import { tokenManager } from '@/shared/api/auth/token-manager';
import { API_ERROR_CODES } from '@/shared/api/error-codes';
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
});
