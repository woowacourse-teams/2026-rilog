import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PostFeedItem } from '@/domains/post/model/post-feed';

import PostFeedCard from './PostFeedCard';

const PERSONAL_POST: PostFeedItem = {
	id: 17,
	title: '함께 기록하는 방법',
	thumbnailUrl: 'https://images.rilog.test/post.png',
	publishedAt: '2026-08-04T23:59:59',
	author: {
		nickname: '리로거',
		profileImageUrl: null,
	},
	colog: null,
};

describe('PostFeedCard', () => {
	it('게시글 제목을 이름으로 갖는 상세 링크와 작성 정보를 제공한다', () => {
		render(<PostFeedCard post={PERSONAL_POST} />);

		expect(screen.getByRole('link', { name: /함께 기록하는 방법/ })).toHaveAttribute('href', '/posts/17');
		expect(screen.getByText('리로거')).toBeInTheDocument();
		expect(screen.getByText('2026년 8월 4일')).toHaveAttribute('datetime', PERSONAL_POST.publishedAt);
	});

	it('썸네일을 불러오지 못하면 Rilog 기본 이미지를 표시한다', () => {
		render(<PostFeedCard post={PERSONAL_POST} />);

		const thumbnail = screen.getByRole('img', { name: '함께 기록하는 방법 썸네일' });
		fireEvent.error(thumbnail);

		expect(thumbnail.getAttribute('src')).toMatch(/\/brand\/logo\.svg$/);
	});

	it('썸네일 URL이 없으면 처음부터 Rilog 기본 이미지를 표시한다', () => {
		render(<PostFeedCard post={{ ...PERSONAL_POST, thumbnailUrl: null }} />);

		expect(screen.getByRole('img', { name: '함께 기록하는 방법 썸네일' }).getAttribute('src')).toMatch(
			/\/brand\/logo\.svg$/,
		);
	});

	it('Colog 글에만 팀 이름 배지를 표시한다', () => {
		const { rerender } = render(<PostFeedCard post={PERSONAL_POST} />);

		expect(screen.queryByText('리로그 팀')).not.toBeInTheDocument();

		rerender(
			<PostFeedCard
				post={{
					...PERSONAL_POST,
					colog: { name: '리로그 팀', logoUrl: null },
				}}
			/>,
		);

		expect(screen.getByText('리로그 팀')).toBeInTheDocument();
	});
});
