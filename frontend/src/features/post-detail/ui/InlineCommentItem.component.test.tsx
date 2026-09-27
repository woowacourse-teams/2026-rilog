import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { POST_81_INLINE_COMMENT_BLOCKS_FIXTURE } from '../model/inline-comment.fixture';

import InlineCommentItem from './InlineCommentItem';

const comment = POST_81_INLINE_COMMENT_BLOCKS_FIXTURE[0].anchors[0].comments[0];

describe('InlineCommentItem', () => {
	it('아바타와 이름을 작성자 블로그로 연결하고 작성자 배지를 우선 표시한다', () => {
		render(
			<InlineCommentItem
				comment={{ ...comment, isEdited: true, author: { ...comment.author, isAuthor: true, isBlogMember: true } }}
			/>,
		);
		expect(screen.getByRole('link', { name: `${comment.author.nickname}님의 블로그로 이동` })).toHaveAttribute(
			'href',
			`/@${comment.author.slug}`,
		);
		expect(screen.getByRole('link', { name: comment.author.nickname })).toHaveAttribute(
			'href',
			`/@${comment.author.slug}`,
		);
		expect(screen.getByText('작성자')).toBeInTheDocument();
		expect(screen.queryByText('멤버')).not.toBeInTheDocument();
		expect(screen.getByText('편집됨')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '수정' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
	});

	it('게시글 작성자가 아닌 블로그 멤버에게 멤버 배지를 표시한다', () => {
		render(
			<InlineCommentItem
				comment={{ ...comment, author: { ...comment.author, isAuthor: false, isBlogMember: true } }}
			/>,
		);
		expect(screen.getByText('멤버')).toBeInTheDocument();
		expect(screen.queryByText('작성자')).not.toBeInTheDocument();
	});
});
