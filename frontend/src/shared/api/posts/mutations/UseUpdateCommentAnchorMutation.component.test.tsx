import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { InvalidApiResponseError } from '@/shared/api/response-validation';
import { createTestQueryClient } from '@/test/render-with-query';

import * as postsApi from '../api';
import { postsQueryKeys } from '../queries/keys';

import { useUpdatePostCommentAnchorMutation } from './use-update-comment-anchor-mutation';

describe('useUpdatePostCommentAnchorMutation', () => {
	it('수정 응답을 확인할 수 없으면 댓글 목록을 새로 확인하고 오류를 전달한다', async () => {
		const client = createTestQueryClient();
		const key = postsQueryKeys.commentAnchors(81, true);
		client.setQueryData(key, { data: { blocks: [] } });
		vi.spyOn(postsApi, 'updatePostCommentAnchor').mockRejectedValue(new InvalidApiResponseError('update comment'));
		const { result } = renderHook(() => useUpdatePostCommentAnchorMutation(81, 91), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
		});
		await expect(result.current.mutateAsync({ content: '수정' })).rejects.toBeInstanceOf(InvalidApiResponseError);
		expect(client.getQueryState(key)?.isInvalidated).toBe(true);
		vi.restoreAllMocks();
	});
	it('수정 성공 후 해당 게시글의 본문·사이드바의 로그인·비회원 목록만 무효화한다', async () => {
		const client = createTestQueryClient();
		const keys = [
			postsQueryKeys.commentAnchors(81, true),
			postsQueryKeys.commentAnchors(81, false),
			postsQueryKeys.commentAnchorsSidebar(81, true),
			postsQueryKeys.commentAnchorsSidebar(81, false),
			postsQueryKeys.commentAnchors(82, true),
			postsQueryKeys.commentAnchorsSidebar(82, false),
		];
		keys.forEach((key) => client.setQueryData(key, { data: { blocks: [] } }));
		vi.spyOn(postsApi, 'updatePostCommentAnchor').mockResolvedValue({
			status: 0,
			message: 'OK',
			data: {
				commentAnchorId: 91,
				content: '댓글',
				isEdited: true,
				createdAt: '2026-09-27T10:49:45.375Z',
				updatedAt: '2026-09-27T10:50:45.375Z',
			},
		});
		const { result } = renderHook(() => useUpdatePostCommentAnchorMutation(81, 91), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
		});
		await result.current.mutateAsync({
			content: '댓글',
		});
		expect(postsApi.updatePostCommentAnchor).toHaveBeenCalledWith(81, 91, { content: '댓글' });
		expect(client.getQueryState(keys[0])?.isInvalidated).toBe(true);
		expect(client.getQueryState(keys[1])?.isInvalidated).toBe(true);
		expect(client.getQueryState(keys[2])?.isInvalidated).toBe(true);
		expect(client.getQueryState(keys[3])?.isInvalidated).toBe(true);
		expect(client.getQueryState(keys[4])?.isInvalidated).toBe(false);
		expect(client.getQueryState(keys[5])?.isInvalidated).toBe(false);
		vi.restoreAllMocks();
	});
});
