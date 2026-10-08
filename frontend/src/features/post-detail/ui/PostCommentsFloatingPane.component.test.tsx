import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { LOGIN_MODAL_CONTEXT } from '@/features/login/model/login-modal-context';
import { renderWithQuery } from '@/test/render-with-query';

import PostCommentsFloatingPane from './PostCommentsFloatingPane';

const SELECTION = { blockId: 'block-1', startOffset: 0, endOffset: 4, selectedText: '본문 인용' };

const renderPane = (props: Partial<ComponentProps<typeof PostCommentsFloatingPane>> = {}) => {
	const view = (nextProps: Partial<ComponentProps<typeof PostCommentsFloatingPane>>) => (
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false }}>
			<LOGIN_MODAL_CONTEXT.Provider value={vi.fn()}>
				<button>본문 탐색</button>
				<PostCommentsFloatingPane
					open
					postId={81}
					mode="single"
					threads={[]}
					onClose={vi.fn()}
					onNavigate={vi.fn()}
					{...nextProps}
				/>
			</LOGIN_MODAL_CONTEXT.Provider>
		</AUTH_CONTEXT.Provider>
	);
	const result = renderWithQuery(view(props));
	return {
		...result,
		rerenderPane: (nextProps: Partial<ComponentProps<typeof PostCommentsFloatingPane>>) =>
			result.rerender(view(nextProps)),
	};
};

describe('PostCommentsFloatingPane', () => {
	it('본문 선택으로 작성 패널을 열면 댓글 입력창에 포커스한다', () => {
		const { rerenderPane } = renderPane({ open: false, selection: SELECTION });
		rerenderPane({ selection: SELECTION });
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveFocus();
		expect(screen.getByRole('region', { name: '인라인 댓글 0' })).toBeVisible();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it.each([true, false])('댓글 조회가 로딩 상태 %s에서 대상 인용을 받으면 해당 입력창에 포커스한다', (isLoading) => {
		const { rerenderPane } = renderPane({ composerAnchorId: 1, isLoading });
		rerenderPane({
			composerAnchorId: 1,
			isLoading: false,
			threads: [
				{
					blockId: 'block-1',
					anchor: {
						anchorId: 1,
						commentCount: 0,
						range: { startOffset: 0, endOffset: 4 },
						selectedText: '본문 인용',
						state: 'ACTIVE',
						comments: [],
					},
				},
			],
		});
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveFocus();
	});

	it('댓글 목록을 열어도 본문의 포커스를 가져가지 않는다', async () => {
		const user = userEvent.setup();
		const { rerenderPane } = renderPane({ open: false, mode: 'all' });
		await user.click(screen.getByRole('button', { name: '본문 탐색' }));
		rerenderPane({ mode: 'all' });
		expect(screen.getByRole('button', { name: '본문 탐색' })).toHaveFocus();
	});
});
