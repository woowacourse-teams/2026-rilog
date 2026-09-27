import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { POST_81_INLINE_COMMENT_BLOCKS_FIXTURE } from '../model/inline-comment.fixture';

import InlineCommentItem from './InlineCommentItem';

const COMMENT = POST_81_INLINE_COMMENT_BLOCKS_FIXTURE[0].anchors[0].comments[0];

describe('InlineCommentItem', () => {
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
