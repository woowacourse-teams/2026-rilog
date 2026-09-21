import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { POST_81_INLINE_COMMENT_BLOCKS_FIXTURE } from '../model/inline-comment.fixture';

import InlineCommentThread from './InlineCommentThread';

const THREAD = {
	blockId: POST_81_INLINE_COMMENT_BLOCKS_FIXTURE[0].blockId,
	anchor: POST_81_INLINE_COMMENT_BLOCKS_FIXTURE[0].anchors[0],
};

describe('InlineCommentThread', () => {
	it('접힌 댓글은 스크린리더와 키보드 탐색에서 숨기고 열면 노출한다', async () => {
		const user = userEvent.setup();
		render(<InlineCommentThread thread={THREAD} onNavigate={vi.fn()} />);

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
