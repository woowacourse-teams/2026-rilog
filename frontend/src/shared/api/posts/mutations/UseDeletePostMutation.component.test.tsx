import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import * as postsApi from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

import { useDeletePostMutation } from './use-delete-post-mutation';

describe('useDeletePostMutation', () => {
	it('삭제 성공 후 상세 캐시를 제거하고 피드, 블로그와 게시글 수 캐시를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const removeQueries = vi.spyOn(queryClient, 'removeQueries');
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		const deletePost = vi.spyOn(postsApi, 'deletePost').mockResolvedValue(new Response(null, { status: 204 }));
		const { result } = renderHook(() => useDeletePostMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		await result.current.mutateAsync(31);

		expect(deletePost).toHaveBeenCalledWith(31);
		expect(removeQueries).toHaveBeenCalledWith({ queryKey: postsQueryKeys.detail(31), exact: true });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: feedsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: postsQueryKeys.count() });
		expect(invalidateQueries).toHaveBeenCalledTimes(3);
	});
});
