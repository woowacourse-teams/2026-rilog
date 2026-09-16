import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

import { tokenManager } from '@/shared/api/auth/token-manager';
import { apiClient } from '@/shared/api/client';
import { myInfoQueryOptions } from '@/shared/api/users/queries/my-info/query-options';
import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';
import { createUnauthorizedResponse } from '@/test/fixtures/api-response';

import AuthenticatedQueryCacheSubscriber from './AuthenticatedQueryCacheSubscriber';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('AuthenticatedQueryCacheSubscriber', () => {
	it('새 로그인에서 이전 인증 캐시만 초기화하고 공개 캐시는 유지한다', async () => {
		const queryClient = new QueryClient();
		const key = myInfoQueryOptions().queryKey;
		queryClient.setQueryData(key, {
			status: 200,
			message: 'OK',
			data: { id: 1, slug: 'old-user', nickname: '이전 사용자', profileImageUrl: null },
		});
		queryClient.setQueryData(['posts'], ['public-post']);
		render(
			<QueryClientProvider client={queryClient}>
				<AuthenticatedQueryCacheSubscriber />
			</QueryClientProvider>,
		);
		await act(async () => {
			await tokenManager.publishLogin('new-access-token');
		});
		expect(queryClient.getQueryData(key)).toBeUndefined();
		expect(queryClient.getQueryData(['posts'])).toEqual(['public-post']);
	});
	it('로그아웃은 진행 중인 내 정보 HTTP 요청을 취소하고 늦은 응답도 캐시에 남기지 않는다', async () => {
		await tokenManager.publishLogin('access-token');
		const response = Promise.withResolvers<Response>();
		const fetchMock = vi.fn().mockReturnValue(response.promise);
		vi.stubGlobal('fetch', fetchMock);
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		render(
			<QueryClientProvider client={queryClient}>
				<AuthenticatedQueryCacheSubscriber />
			</QueryClientProvider>,
		);
		const options = myInfoQueryOptions();
		const pendingQuery = queryClient.fetchQuery(options);
		const cancelledQuery = expect(pendingQuery).rejects.toThrow();
		await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
		const request = fetchMock.mock.calls[0][0] as Request;
		expect(request.signal.aborted).toBe(false);
		await act(async () => {
			await tokenManager.publishLogout();
		});
		expect(request.signal.aborted).toBe(true);
		response.resolve(Response.json({ data: { id: 42, slug: 'old-user', nickname: '이전 사용자' } }));
		await cancelledQuery;
		expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
	});

	it('logout 이벤트 발생 시 인증 query cache를 제거하고 구독을 정리한다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockImplementation(() => Promise.resolve(createUnauthorizedResponse())),
		);
		const queryClient = new QueryClient();
		const currentUserQueryKey = [...authenticatedQueryKeys.all, 'current-user'] as const;
		const postsQueryKey = ['posts'] as const;
		queryClient.setQueryData(currentUserQueryKey, { id: 1 });
		queryClient.setQueryData(postsQueryKey, [{ id: 1 }]);
		const { unmount } = render(
			<QueryClientProvider client={queryClient}>
				<AuthenticatedQueryCacheSubscriber />
			</QueryClientProvider>,
		);

		await expect(apiClient.get('posts')).rejects.toMatchObject({
			response: { status: 401 },
		});

		expect(queryClient.getQueryData(currentUserQueryKey)).toBeUndefined();
		expect(queryClient.getQueryData(postsQueryKey)).toEqual([{ id: 1 }]);

		unmount();
		queryClient.setQueryData(currentUserQueryKey, { id: 1 });
		await expect(apiClient.get('posts')).rejects.toMatchObject({
			response: { status: 401 },
		});
		expect(queryClient.getQueryData(currentUserQueryKey)).toEqual({ id: 1 });
	});
});
