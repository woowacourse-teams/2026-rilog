import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import * as draftsApi from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';

import { usePublishDraftMutation } from './use-publish-draft-mutation';

const createWrapper = (queryClient: QueryClient) => {
	function TestQueryProviderWrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children);
	}

	return TestQueryProviderWrapper;
};

describe('usePublishDraftMutation', () => {
	it('발행 성공 후 임시저장 상세를 제거하고 관련 목록과 게시글 캐시를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const removeQueries = vi.spyOn(queryClient, 'removeQueries');
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		vi.spyOn(draftsApi, 'publishDraft').mockResolvedValue({
			status: 200,
			message: '임시저장 글을 발행했습니다.',
			data: { postId: 77, slug: 'rilog' },
		});
		const { result } = renderHook(() => usePublishDraftMutation(), { wrapper: createWrapper(queryClient) });
		const request = {
			slug: 'rilog',
			title: '발행할 글',
			content: [],
			category: 'TECH' as const,
			visibility: 'PUBLIC' as const,
			thumbnailImageUrl: null,
		};

		await result.current.mutateAsync({ draftId: 42, request });

		expect(draftsApi.publishDraft).toHaveBeenCalledWith(42, request);
		expect(removeQueries).toHaveBeenCalledWith({ queryKey: draftsQueryKeys.detail(42), exact: true });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: draftsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: feedsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.publicBlogPosts('rilog') });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.publicProfile('rilog') });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: postsQueryKeys.count() });
		expect(invalidateQueries).toHaveBeenCalledTimes(5);
	});
});
