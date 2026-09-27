import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/test/render-with-query';

import * as postsApi from '../api';
import { postsQueryKeys } from '../queries/keys';

import { useUpdatePostCommentAnchorMutation } from './use-update-comment-anchor-mutation';

describe('useUpdatePostCommentAnchorMutation', () => {
	it('수정 성공 후 해당 게시글의 로그인·비회원 목록만 무효화한다', async () => {
		const client = createTestQueryClient();
		const keys = [
			postsQueryKeys.commentAnchors(81, true),
			postsQueryKeys.commentAnchors(81, false),
			postsQueryKeys.commentAnchors(82, true),
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
		expect(client.getQueryState(keys[2])?.isInvalidated).toBe(false);
		vi.restoreAllMocks();
	});
});
