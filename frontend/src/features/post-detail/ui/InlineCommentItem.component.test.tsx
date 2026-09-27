import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { POST_81_INLINE_COMMENT_BLOCKS_FIXTURE } from '../model/inline-comment.fixture';

import InlineCommentItem from './InlineCommentItem';

const COMMENT = POST_81_INLINE_COMMENT_BLOCKS_FIXTURE[0].anchors[0].comments[0];

describe('InlineCommentItem', () => {
	it('수정을 누르면 원문을 편집하고 취소하면 원문과 수정 버튼 포커스를 복원한다', async () => {
		const user = userEvent.setup();
		render(<InlineCommentItem comment={{ ...COMMENT, canEdit: true, canDelete: true }} />);
		await user.click(screen.getByRole('button', { name: '수정' }));
		const input = screen.getByRole('textbox', { name: '댓글 수정' });
		expect(input).toHaveValue(COMMENT.content);
		expect(input).toHaveFocus();
		expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
		await user.clear(input);
		await user.type(input, '수정 내용{Enter}두 번째 줄');
		expect(input).toHaveValue('수정 내용\n두 번째 줄');
		expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
		await user.click(screen.getByRole('button', { name: '취소' }));
		expect(screen.queryByRole('textbox', { name: '댓글 수정' })).not.toBeInTheDocument();
		expect(screen.getByText(COMMENT.content)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '수정' })).toHaveFocus();
		await user.keyboard('{Enter}');
		expect(screen.getByRole('textbox', { name: '댓글 수정' })).toHaveValue(COMMENT.content);
	});

	it.each([
		{ canEdit: true, canDelete: true },
		{ canEdit: true, canDelete: false },
		{ canEdit: false, canDelete: true },
		{ canEdit: false, canDelete: false },
	])('수정 권한=$canEdit, 삭제 권한=$canDelete이면 허용된 버튼만 표시한다', ({ canEdit, canDelete }) => {
		render(<InlineCommentItem comment={{ ...COMMENT, canEdit, canDelete }} />);
		if (canEdit) expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
		else expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
		if (canDelete) expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();
		else expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
	});

	it.each([
		{ isAuthor: true, isBlogMember: true, badge: '작성자' },
		{ isAuthor: true, isBlogMember: false, badge: '작성자' },
		{ isAuthor: false, isBlogMember: true, badge: '멤버' },
		{ isAuthor: false, isBlogMember: false, badge: null },
	])('작성자=$isAuthor, 멤버=$isBlogMember이면 $badge 배지만 표시한다', ({ isAuthor, isBlogMember, badge }) => {
		render(<InlineCommentItem comment={{ ...COMMENT, author: { ...COMMENT.author, isAuthor, isBlogMember } }} />);
		for (const label of ['작성자', '멤버']) {
			if (label === badge) expect(screen.getByText(label)).toBeInTheDocument();
			else expect(screen.queryByText(label)).not.toBeInTheDocument();
		}
	});
});
