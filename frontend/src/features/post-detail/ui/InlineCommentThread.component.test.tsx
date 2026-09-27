import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { POST_81_INLINE_COMMENT_BLOCKS_FIXTURE } from '../model/inline-comment.fixture';

import InlineCommentThread from './InlineCommentThread';

const block = POST_81_INLINE_COMMENT_BLOCKS_FIXTURE[0];
const thread = { blockId: block.blockId, anchor: block.anchors[0] };

describe('InlineCommentThread', () => {
	it('접힌 댓글을 접근성 트리에서 숨기고 키보드로 펼치면 읽을 수 있다', async () => {
		const user = userEvent.setup();
		render(<InlineCommentThread thread={thread} onNavigate={vi.fn()} />);
		expect(screen.queryByRole('article')).not.toBeInTheDocument();
		const toggle = screen.getByRole('button', { name: '댓글 펼치기' });
		toggle.focus();
		await user.keyboard('{Enter}');
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('article')).toHaveTextContent(thread.anchor.comments[0].content);
		await user.keyboard(' ');
		expect(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByRole('article')).not.toBeInTheDocument();
	});

	it('빈 스레드를 펼치면 빈 상태를 표시한다', async () => {
		const user = userEvent.setup();
		render(
			<InlineCommentThread thread={{ ...thread, anchor: { ...thread.anchor, comments: [] } }} onNavigate={vi.fn()} />,
		);
		await user.click(screen.getByRole('button', { name: '댓글 펼치기' }));
		expect(screen.getByText('아직 댓글이 없습니다.')).toBeInTheDocument();
	});
});
