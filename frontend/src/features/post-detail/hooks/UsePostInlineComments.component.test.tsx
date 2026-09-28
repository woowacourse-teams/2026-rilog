import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import * as postsApi from '@/shared/api/posts/api';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';
import type { PostCommentAnchorGroupResponse } from '@/shared/api/posts/types';
import { createTestQueryClient } from '@/test/render-with-query';

import { usePostInlineComments } from './use-post-inline-comments';
import { usePostInlineCommentsSidebar } from './use-post-inline-comments-sidebar';

const createGroup = (canEdit: boolean): PostCommentAnchorGroupResponse => ({
	selectionId: 20,
	range: { startOffset: 1, endOffset: 3 },
	selectedText: '😀',
	state: 'ORPHANED',
	anchorCount: 1,
	commentAnchors: [
		{
			commentAnchorId: 91,
			content: '댓글',
			author: {
				userId: 1,
				nickname: '작성자',
				slug: 'author',
				profileImageUrl: null,
				isPostAuthor: true,
				isBlogMember: false,
			},
			canEdit,
			canDelete: canEdit,
			isEdited: true,
			createdAt: '2026-09-27T10:00:00',
			updatedAt: '2026-09-27T11:00:00',
		},
	],
});

const useBothQueries = () => ({
	body: usePostInlineComments(81),
	sidebar: usePostInlineCommentsSidebar(81),
});

afterEach(() => vi.restoreAllMocks());

describe('인라인 댓글 조회 consumer', () => {
	it('인증 초기화 후 조회하고 로그인 전후의 권한과 본문·사이드바 캐시를 분리한다', async () => {
		let auth = { isAuthenticated: false, isInitialized: false, isOnboarding: false };
		const readBody = vi.spyOn(postsApi, 'readPostCommentAnchors').mockImplementation(() =>
			Promise.resolve({
				status: 200,
				message: 'OK',
				data: { blocks: [{ blockId: 'block', anchorGroups: [createGroup(auth.isAuthenticated)] }] },
			}),
		);
		const readSidebar = vi.spyOn(postsApi, 'readPostCommentAnchorsSidebar').mockImplementation(() =>
			Promise.resolve({
				status: 200,
				message: 'OK',
				data: { anchorGroups: [{ ...createGroup(auth.isAuthenticated), blockId: 'block' }] },
			}),
		);
		const queryClient = createTestQueryClient();
		const { result, rerender, unmount } = renderHook(useBothQueries, {
			wrapper: ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={queryClient}>
					<AUTH_CONTEXT.Provider value={auth}>{children}</AUTH_CONTEXT.Provider>
				</QueryClientProvider>
			),
		});
		expect(result.current.body.fetchStatus).toBe('idle');
		expect(result.current.sidebar.fetchStatus).toBe('idle');
		expect(readBody).not.toHaveBeenCalled();
		expect(readSidebar).not.toHaveBeenCalled();

		auth = { ...auth, isInitialized: true };
		rerender();
		await waitFor(() => expect(result.current.body.isSuccess && result.current.sidebar.isSuccess).toBe(true));
		expect(result.current.body.data?.[0].anchors[0]).toMatchObject({
			anchorId: 20,
			state: 'OUTDATED',
			range: { startOffset: 1, endOffset: 3 },
		});
		expect(result.current.sidebar.data?.[0].anchor.comments[0]).toMatchObject({
			commentId: 91,
			canEdit: false,
			isEdited: true,
		});

		auth = { ...auth, isAuthenticated: true };
		rerender();
		await waitFor(() => expect(result.current.body.data?.[0].anchors[0].comments[0].canEdit).toBe(true));
		await waitFor(() => expect(result.current.sidebar.data?.[0].anchor.comments[0].canEdit).toBe(true));
		expect(readBody).toHaveBeenCalledWith(81);
		expect(readSidebar).toHaveBeenCalledWith(81);
		for (const authenticated of [false, true]) {
			expect(queryClient.getQueryData(postsQueryKeys.commentAnchors(81, authenticated))).toMatchObject({
				data: { blocks: [{ anchorGroups: [{ commentAnchors: [{ canEdit: authenticated }] }] }] },
			});
			expect(queryClient.getQueryData(postsQueryKeys.commentAnchorsSidebar(81, authenticated))).toMatchObject({
				data: { anchorGroups: [{ commentAnchors: [{ canEdit: authenticated }] }] },
			});
		}
		unmount();
		queryClient.clear();
	});

	it('본문 조회가 실패해도 사이드바 조회 결과는 유지하고 실패를 빈 목록으로 숨기지 않는다', async () => {
		const failure = new Error('본문 조회 실패');
		vi.spyOn(postsApi, 'readPostCommentAnchors').mockRejectedValue(failure);
		vi.spyOn(postsApi, 'readPostCommentAnchorsSidebar').mockResolvedValue({
			status: 200,
			message: 'OK',
			data: { anchorGroups: [] },
		});
		const queryClient = createTestQueryClient();
		const { result, unmount } = renderHook(useBothQueries, {
			wrapper: ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={queryClient}>
					<AUTH_CONTEXT.Provider value={{ isAuthenticated: false, isInitialized: true, isOnboarding: false }}>
						{children}
					</AUTH_CONTEXT.Provider>
				</QueryClientProvider>
			),
		});
		await waitFor(() => expect(result.current.body.isError && result.current.sidebar.isSuccess).toBe(true));
		expect(result.current.body.error).toBe(failure);
		expect(result.current.body.data).toBeUndefined();
		expect(result.current.sidebar.data).toEqual([]);
		unmount();
		queryClient.clear();
	});
});
