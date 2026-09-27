import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { POST_81_INLINE_COMMENT_BLOCKS_FIXTURE } from '../model/inline-comment.fixture';

import InlineCommentItem from './InlineCommentItem';

const COMMENT = POST_81_INLINE_COMMENT_BLOCKS_FIXTURE[0].anchors[0].comments[0];

describe('InlineCommentItem', () => {
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
