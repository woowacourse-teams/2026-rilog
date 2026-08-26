import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import * as postsApi from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

import { useUpdatePostMutation } from './use-update-post-mutation';

describe('useUpdatePostMutation', () => {
	it('수정 성공 후 게시글 상세, 피드와 블로그 글 목록 캐시를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		const updatePost = vi.spyOn(postsApi, 'updatePost').mockResolvedValue({
			status: 200,
			message: '게시글이 수정되었습니다.',
			data: { postId: 31, slug: 'personal-blog' },
		});
		const request = {
			slug: 'personal-blog',
			title: '수정한 글',
			content: [],
			category: 'DAILY' as const,
			visibility: 'PUBLIC' as const,
			thumbnailImageUrl: null,
		};
		const { result } = renderHook(() => useUpdatePostMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		await result.current.mutateAsync({ postId: 31, request });

		expect(updatePost).toHaveBeenCalledWith(31, request);
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: postsQueryKeys.detail(31) });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: feedsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledTimes(3);
	});
});
