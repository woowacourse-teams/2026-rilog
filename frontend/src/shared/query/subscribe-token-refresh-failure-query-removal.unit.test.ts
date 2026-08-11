import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

import { apiClient } from '../api/api-client';

import { subscribeTokenRefreshFailureQueryRemoval } from './subscribe-token-refresh-failure-query-removal';

const createResponse = (status: number) => new Response(null, { status });

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('subscribeTokenRefreshFailureQueryRemoval', () => {
	it('token 갱신 실패 시 지정한 query cache만 제거한다', async () => {
		vi.stubGlobal('window', {});
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createResponse(401)));
		const queryClient = new QueryClient();
		const currentUserQueryKey = ['current-user'] as const;
		const postsQueryKey = ['posts'] as const;
		queryClient.setQueryData(currentUserQueryKey, { id: 1 });
		queryClient.setQueryData(postsQueryKey, [{ id: 1 }]);
		const unsubscribe = subscribeTokenRefreshFailureQueryRemoval({
			queryClient,
			queryKey: currentUserQueryKey,
		});

		await expect(apiClient.get('posts')).rejects.toMatchObject({
			response: { status: 401 },
		});

		expect(queryClient.getQueryData(currentUserQueryKey)).toBeUndefined();
		expect(queryClient.getQueryData(postsQueryKey)).toEqual([{ id: 1 }]);
		unsubscribe();
	});
});
