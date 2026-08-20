import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '@/shared/api/client';
import { createUnauthorizedResponse } from '@/test/fixtures/api-response';

import { authenticatedQueryKeys } from './authenticated-query-keys';
import { subscribeLogoutQueryRemoval } from './subscribe-logout-query-removal';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('subscribeLogoutQueryRemoval', () => {
	it('logout 이벤트 발생 시 지정한 query cache만 제거한다', async () => {
		vi.stubGlobal('window', {});
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createUnauthorizedResponse()));
		const queryClient = new QueryClient();
		const currentUserQueryKey = [...authenticatedQueryKeys.all] as const;
		const postsQueryKey = ['posts'] as const;
		queryClient.setQueryData(currentUserQueryKey, { id: 1 });
		queryClient.setQueryData(postsQueryKey, [{ id: 1 }]);
		const unsubscribe = subscribeLogoutQueryRemoval({
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
