import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as blogsApi from '@/shared/api/blogs/api';
import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';

import { useCreateBlogChapterMutation } from './use-create-blog-chapter-mutation';
import { useDeleteBlogChapterMutation } from './use-delete-blog-chapter-mutation';
import { useRenameBlogChapterMutation } from './use-rename-blog-chapter-mutation';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('blog chapter mutations', () => {
	it('챕터 생성 성공 후 정규화한 블로그의 챕터 목록과 인덱스를 정확히 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		vi.spyOn(blogsApi, 'createBlogChapter').mockResolvedValue({
			status: 201,
			message: '챕터를 생성했습니다.',
			data: { chapterId: 1, name: '프론트엔드', order: 0 },
		});
		const { result } = renderHook(() => useCreateBlogChapterMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		await result.current.mutateAsync({ slug: '@rilog', request: { name: '프론트엔드' } });

		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: blogsQueryKeys.chapters('rilog'),
			exact: true,
		});
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.index('rilog'), exact: true });
		expect(invalidateQueries).toHaveBeenCalledTimes(2);
	});

	it('챕터 이름 변경 성공 후 정규화한 블로그의 챕터 목록과 인덱스를 정확히 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		vi.spyOn(blogsApi, 'renameBlogChapter').mockResolvedValue({
			status: 200,
			message: '챕터 이름을 변경했습니다.',
			data: { chapterId: 1, name: '웹', order: 0 },
		});
		const { result } = renderHook(() => useRenameBlogChapterMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		await result.current.mutateAsync({ slug: '@rilog', chapterId: 1, request: { name: '웹' } });

		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: blogsQueryKeys.chapters('rilog'),
			exact: true,
		});
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.index('rilog'), exact: true });
		expect(invalidateQueries).toHaveBeenCalledTimes(2);
	});

	it('챕터 삭제 성공 후 정규화한 블로그의 챕터 목록과 인덱스를 정확히 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		vi.spyOn(blogsApi, 'deleteBlogChapter').mockResolvedValue(new Response(null, { status: 204 }));
		const { result } = renderHook(() => useDeleteBlogChapterMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		await result.current.mutateAsync({ slug: '@rilog', chapterId: 1 });

		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: blogsQueryKeys.chapters('rilog'),
			exact: true,
		});
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.index('rilog'), exact: true });
		expect(invalidateQueries).toHaveBeenCalledTimes(2);
	});
});
