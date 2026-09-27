import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { renderWithQuery } from '@/test/render-with-query';

import { POST_81_INLINE_COMMENT_BLOCKS_FIXTURE } from '../model/inline-comment.fixture';

import InlineCommentThread from './InlineCommentThread';

const render = (ui: ReactNode) =>
	renderWithQuery(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false }}>
			{ui}
		</AUTH_CONTEXT.Provider>,
	);

const THREAD = {
	blockId: POST_81_INLINE_COMMENT_BLOCKS_FIXTURE[0].blockId,
	anchor: POST_81_INLINE_COMMENT_BLOCKS_FIXTURE[0].anchors[0],
};

describe('InlineCommentThread', () => {
	beforeEach(() => sessionStorage.clear());
	it('댓글을 펼치면 바로 입력할 수 있고 다시 펼쳐도 작성 내용을 유지한다', async () => {
		const user = userEvent.setup();
		render(<InlineCommentThread postId={81} thread={THREAD} onNavigate={vi.fn()} />);

		await user.tab();
		await user.keyboard('{Enter}');
		await user.tab(); // 본문 이동
		await user.tab(); // 프로필 이미지 링크
		await user.tab(); // 작성자 링크
		await user.tab(); // 수정
		await user.tab(); // 삭제
		await user.tab(); // 댓글 입력

		const textarea = screen.getByRole('textbox', { name: '댓글 입력' });
		const submitButton = screen.getByRole('button', { name: '작성' });
		expect(submitButton).toBeDisabled();
		expect(textarea).toHaveFocus();
		expect(screen.queryByRole('button', { name: '댓글 추가' })).not.toBeInTheDocument();
		await user.type(textarea, '   ');
		expect(submitButton).toBeDisabled();
		await user.clear(textarea);
		await user.type(textarea, '첫 번째 줄{Enter}두 번째 줄');
		expect(submitButton).toBeEnabled();
		await user.tab();
		expect(submitButton).toHaveFocus();
		await user.click(screen.getByRole('button', { name: '댓글 접기' }));
		await user.click(screen.getByRole('button', { name: '댓글 펼치기' }));
		expect(textarea).toHaveValue('첫 번째 줄\n두 번째 줄');
		await user.clear(textarea);
		expect(textarea).toHaveValue('');
		expect(submitButton).toBeDisabled();
	});

	it('아직 댓글이 없는 스레드에도 입력창을 표시한다', async () => {
		const user = userEvent.setup();
		render(
			<InlineCommentThread
				postId={81}
				thread={{ ...THREAD, anchor: { ...THREAD.anchor, comments: [] } }}
				onNavigate={vi.fn()}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '댓글 펼치기' }));
		expect(screen.getByText('아직 댓글이 없습니다.')).toBeVisible();
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toBeEnabled();
	});

	it('접힌 댓글은 스크린리더와 키보드 탐색에서 숨기고 열면 노출한다', async () => {
		const user = userEvent.setup();
		render(<InlineCommentThread postId={81} thread={THREAD} onNavigate={vi.fn()} />);

		const toggle = screen.getByRole('button', { name: '댓글 펼치기' });
		const comments = screen.getByRole('list', { hidden: true });
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(toggle.getAttribute('aria-controls')?.split(' ')).toContain(comments.id);
		expect(comments).toHaveAttribute('aria-hidden', 'true');
		expect(comments).toHaveAttribute('inert');
		expect(screen.queryByRole('article', { name: '인라인댓글테스터님의 댓글' })).not.toBeInTheDocument();

		await user.click(toggle);

		expect(screen.getByRole('button', { name: '댓글 접기' })).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('article', { name: '인라인댓글테스터님의 댓글' })).toBeInTheDocument();
		expect(comments).not.toHaveAttribute('aria-hidden', 'true');
		expect(comments).not.toHaveAttribute('inert');

		await user.click(screen.getByRole('button', { name: '댓글 접기' }));

		expect(screen.queryByRole('article', { name: '인라인댓글테스터님의 댓글' })).not.toBeInTheDocument();
	});
});
