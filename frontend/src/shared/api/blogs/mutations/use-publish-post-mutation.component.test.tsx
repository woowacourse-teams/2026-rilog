import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';

import * as blogsApi from '../api';

import { usePublishPostMutation } from './use-publish-post-mutation';

const createWrapper = (queryClient: QueryClient) => {
	function TestQueryProviderWrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children);
	}

	return TestQueryProviderWrapper;
};

describe('usePublishPostMutation', () => {
	it('발행 성공 후 피드 캐시를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		vi.spyOn(blogsApi, 'publishPost').mockResolvedValue({
			status: 201,
			message: '게시글이 발행되었습니다.',
			data: { postId: 77, slug: 'rilog' },
		});
		const { result } = renderHook(() => usePublishPostMutation(), { wrapper: createWrapper(queryClient) });

		await result.current.mutateAsync({
			slug: 'rilog',
			request: {
				title: '새 글',
				content: [],
				category: 'TECH',
				visibility: 'PUBLIC',
				thumbnailImageUrl: null,
				profileImageUrl: null,
			},
		});

		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: feedsQueryKeys.all });
	});
});
