import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/test/render-with-query';

import * as postsApi from '../api';
import { postsQueryKeys } from '../queries/keys';

import { useDeletePostCommentAnchorMutation } from './use-delete-comment-anchor-mutation';

describe('useDeletePostCommentAnchorMutation', () => {
	it('삭제 성공 후 해당 게시글의 로그인·비회원 목록만 무효화한다', async () => {
		const client = createTestQueryClient();
		const keys = [
			postsQueryKeys.commentAnchors(81, true),
			postsQueryKeys.commentAnchors(81, false),
			postsQueryKeys.commentAnchors(82, true),
		];
		keys.forEach((key) => client.setQueryData(key, { data: { blocks: [] } }));
		vi.spyOn(postsApi, 'deletePostCommentAnchor').mockResolvedValue({
			status: 0,
			message: 'OK',
			data: {
				commentAnchorId: 91,
				selectionId: 9,
			},
		});
		const { result } = renderHook(() => useDeletePostCommentAnchorMutation(81, 91), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
		});
		await result.current.mutateAsync();
		expect(postsApi.deletePostCommentAnchor).toHaveBeenCalledWith(81, 91);
		expect(client.getQueryState(keys[0])?.isInvalidated).toBe(true);
		expect(client.getQueryState(keys[1])?.isInvalidated).toBe(true);
		expect(client.getQueryState(keys[2])?.isInvalidated).toBe(false);
		vi.restoreAllMocks();
	});
});
