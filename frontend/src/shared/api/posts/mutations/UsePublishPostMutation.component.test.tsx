import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import * as postsApi from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

import { usePublishPostMutation } from './use-publish-post-mutation';

const createWrapper = (queryClient: QueryClient) => {
	function TestQueryProviderWrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children);
	}

	return TestQueryProviderWrapper;
};

describe('usePublishPostMutation', () => {
	it('발행 성공 후 피드와 발행 대상 블로그, 전체 글 수 캐시를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		vi.spyOn(postsApi, 'publishPost').mockResolvedValue({
			status: 201,
			message: '게시글이 발행되었습니다.',
			data: { postId: 77, slug: 'rilog' },
		});
		const { result } = renderHook(() => usePublishPostMutation(), { wrapper: createWrapper(queryClient) });

		await result.current.mutateAsync({
			slug: 'rilog',
			title: '새 글',
			content: [],
			category: 'TECH',
			visibility: 'PUBLIC',
			thumbnailImageUrl: null,
		});

		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: feedsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.publicBlogPosts('rilog') });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.publicProfile('rilog') });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: postsQueryKeys.count() });
		expect(invalidateQueries).toHaveBeenCalledTimes(4);
	});
});
