import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/test/render-with-query';

import * as postsApi from '../api';
import { postsQueryKeys } from '../queries/keys';

import { useAddPostCommentAnchorMutation } from './use-add-comment-anchor-mutation';

describe('useAddPostCommentAnchorMutation', () => {
	it('작성 성공 후 해당 게시글의 로그인·비회원 목록만 무효화한다', async () => {
		const client = createTestQueryClient();
		const keys = [
			postsQueryKeys.commentAnchors(81, true),
			postsQueryKeys.commentAnchors(81, false),
			postsQueryKeys.commentAnchors(82, true),
		];
		keys.forEach((key) => client.setQueryData(key, { data: { blocks: [] } }));
		vi.spyOn(postsApi, 'addPostCommentAnchor').mockResolvedValue({
			status: 0,
			message: 'OK',
			data: { commentAnchorId: 900 },
		});
		const { result } = renderHook(() => useAddPostCommentAnchorMutation(81, 91), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
		});
		await result.current.mutateAsync({
			content: '댓글',
		});
		expect(postsApi.addPostCommentAnchor).toHaveBeenCalledWith(81, 91, { content: '댓글' });
		expect(client.getQueryState(keys[0])?.isInvalidated).toBe(true);
		expect(client.getQueryState(keys[1])?.isInvalidated).toBe(true);
		expect(client.getQueryState(keys[2])?.isInvalidated).toBe(false);
		vi.restoreAllMocks();
	});
});
