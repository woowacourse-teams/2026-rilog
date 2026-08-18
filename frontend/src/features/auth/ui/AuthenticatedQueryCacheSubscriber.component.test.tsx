import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

import { apiClient } from '@/shared/api/client';
import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';
import { createUnauthorizedResponse } from '@/test/fixtures/api-response';

import AuthenticatedQueryCacheSubscriber from './AuthenticatedQueryCacheSubscriber';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('AuthenticatedQueryCacheSubscriber', () => {
	it('token 갱신 실패 시 인증 query cache를 제거하고 구독을 정리한다', async () => {
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
