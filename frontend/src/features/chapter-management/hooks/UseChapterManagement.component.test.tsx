import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PropsWithChildren } from 'react';

import * as blogsApi from '@/shared/api/blogs/api';

import { useChapterManagement } from './use-chapter-management';

afterEach(() => {
	vi.restoreAllMocks();
});

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return function Wrapper({ children }: PropsWithChildren) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
	};
};

describe('useChapterManagement', () => {
	it('조회한 챕터를 순서대로 draft 훅에 제공한다', async () => {
		vi.spyOn(blogsApi, 'readBlogChapters').mockResolvedValue({
			status: 200,
			message: '챕터 목록을 조회했습니다.',
			data: [
				{ chapterId: 2, name: '백엔드', order: 1 },
				{ chapterId: 1, name: '프론트엔드', order: 0 },
			],
		});

		const { result } = renderHook(() => useChapterManagement({ slug: '@rilog' }), { wrapper: createWrapper() });

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.chapters).toEqual([
			{ id: 1, name: '프론트엔드' },
			{ id: 2, name: '백엔드' },
		]);
	});

	it('변경된 챕터 이름을 정규화해 저장한다', async () => {
		vi.spyOn(blogsApi, 'readBlogChapters').mockResolvedValue({
			status: 200,
			message: '챕터 목록을 조회했습니다.',
			data: [{ chapterId: 1, name: '프론트엔드', order: 0 }],
		});
		const renameBlogChapter = vi.spyOn(blogsApi, 'renameBlogChapter').mockResolvedValue({
			status: 200,
			message: '챕터 이름을 변경했습니다.',
			data: { chapterId: 1, name: '웹', order: 0 },
		});
		const { result } = renderHook(() => useChapterManagement({ slug: '@rilog' }), { wrapper: createWrapper() });
		await waitFor(() => expect(result.current.chapters).toHaveLength(1));

		act(() => {
			result.current.handleStartEditing();
			result.current.handleNameChange(1, ' 웹 ');
		});
		await act(() => result.current.handleSave());

		expect(renameBlogChapter).toHaveBeenCalledWith('@rilog', 1, { name: '웹' });
		expect(result.current.isEditing).toBe(false);
		expect(result.current.draftChapters).toEqual([]);
	});

	it('챕터 추가 요청을 공통 mutation에 전달한다', async () => {
		vi.spyOn(blogsApi, 'readBlogChapters').mockResolvedValue({
			status: 200,
			message: '챕터 목록을 조회했습니다.',
			data: [],
		});
		const createBlogChapter = vi.spyOn(blogsApi, 'createBlogChapter').mockResolvedValue({
			status: 201,
			message: '챕터를 생성했습니다.',
			data: { chapterId: 1, name: '프론트엔드', order: 0 },
		});
		const { result } = renderHook(() => useChapterManagement({ slug: '@rilog' }), { wrapper: createWrapper() });
		await waitFor(() => expect(result.current.isLoading).toBe(false));

		await act(() => result.current.handleAddChapter(' 프론트엔드 '));

		expect(createBlogChapter).toHaveBeenCalledWith('@rilog', { name: '프론트엔드' });
	});

	it('일부 이름 변경이 실패하면 성공한 draft만 정리하고 실패한 draft와 오류를 유지한다', async () => {
		vi.spyOn(blogsApi, 'readBlogChapters').mockResolvedValue({
			status: 200,
			message: '챕터 목록을 조회했습니다.',
			data: [
				{ chapterId: 1, name: '프론트엔드', order: 0 },
				{ chapterId: 2, name: '백엔드', order: 1 },
			],
		});
		vi.spyOn(blogsApi, 'renameBlogChapter').mockImplementation((_slug, chapterId, request) => {
			if (chapterId === 2) {
				return Promise.reject(new Error('이름 변경 실패'));
			}

			return Promise.resolve({
				status: 200,
				message: '챕터 이름을 변경했습니다.',
				data: { chapterId, name: request.name, order: 0 },
			});
		});
		const { result } = renderHook(() => useChapterManagement({ slug: '@rilog' }), { wrapper: createWrapper() });
		await waitFor(() => expect(result.current.chapters).toHaveLength(2));

		act(() => {
			result.current.handleStartEditing();
			result.current.handleNameChange(1, '웹');
			result.current.handleNameChange(2, '서버');
		});
		await act(() => result.current.handleSave());

		expect(result.current.chapters[0].name).toBe('웹');
		expect(result.current.draftChapters).toEqual([{ id: 2, name: '서버' }]);
		expect(result.current.isEditing).toBe(true);
		expect(result.current.saveError).toEqual(new Error('이름 변경 실패'));
	});
});
