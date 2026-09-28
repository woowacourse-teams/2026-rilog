import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { postsQueryKeys } from '@/shared/api/posts/queries/keys';
import { renderWithQuery } from '@/test/render-with-query';

import InlineCommentComposer from './InlineCommentComposer';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	sessionStorage.clear();
});

it('댓글 쓰기의 JSON을 확인할 수 없으면 초안을 보존하고 목록을 갱신하며 재전송하지 않는다', async () => {
	const fetchMock = vi.fn().mockResolvedValue(new Response('{broken', { status: 201 }));
	vi.stubGlobal('fetch', fetchMock);
	const user = userEvent.setup();
	const { queryClient } = renderWithQuery(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false }}>
			<InlineCommentComposer
				postId={81}
				selection={{ blockId: 'block-1', startOffset: 0, endOffset: 2, selectedText: '인용' }}
				inputRef={{ current: null }}
			/>
		</AUTH_CONTEXT.Provider>,
	);
	const commentKey = postsQueryKeys.commentAnchors(81, true);
	queryClient.setQueryData(commentKey, { status: 200, message: 'OK', data: { blocks: [] } });

	await user.type(screen.getByRole('textbox', { name: '댓글 입력' }), '보존할 댓글');
	await user.click(screen.getByRole('button', { name: '작성' }));

	expect(await screen.findByRole('alert')).toHaveTextContent('댓글 목록에서 등록 여부를 확인해 주세요.');
	expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveValue('보존할 댓글');
	await waitFor(() => expect(queryClient.getQueryState(commentKey)?.isInvalidated).toBe(true));
	expect(fetchMock).toHaveBeenCalledTimes(1);
});
