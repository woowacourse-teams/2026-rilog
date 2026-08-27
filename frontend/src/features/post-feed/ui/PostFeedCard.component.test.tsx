import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PostFeedItem } from '@/domains/post/model/post';

import PostFeedCard from './PostFeedCard';

const PERSONAL_POST: PostFeedItem = {
	id: 17,
	title: '함께 기록하는 방법',
	thumbnailUrl: 'https://images.rilog.test/post.png',
	publishedAt: '2026-08-04T23:59:59',
	author: {
		id: 1,
		nickname: '리로거',
		slug: 'rilogger',
		profileImageUrl: null,
	},
	blog: { id: 1, name: '리로거', slug: 'rilogger', type: 'RILOG', profileImageUrl: null },
};

describe('PostFeedCard', () => {
	it('게시글 제목을 이름으로 갖는 상세 링크와 작성 정보를 제공한다', () => {
		render(<PostFeedCard post={PERSONAL_POST} position={3} />);

		expect(screen.getByRole('link', { name: /함께 기록하는 방법/ })).toHaveAttribute('href', '/@rilogger/posts/17');
		expect(screen.getByRole('heading', { name: '함께 기록하는 방법' })).toHaveClass('text-body-3');
		expect(screen.getByText('리로거')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '리로거 프로필' })).toHaveTextContent('리');
		expect(screen.getAllByRole('link')).toHaveLength(1);
		expect(screen.getByText('2026년 8월 4일')).toHaveAttribute('datetime', PERSONAL_POST.publishedAt);
	});

	it('작성자 프로필 이미지가 있으면 UserAvatar에 표시한다', () => {
		render(
			<PostFeedCard
				position={1}
				post={{
					...PERSONAL_POST,
					author: { ...PERSONAL_POST.author, profileImageUrl: 'https://images.rilog.test/profile.png' },
				}}
			/>,
		);

		const avatar = screen.getByRole('img', { name: '리로거 프로필' });

		expect(avatar.querySelector('img')).toHaveAttribute('src', 'https://images.rilog.test/profile.png');
		expect(avatar).toHaveClass('border', 'border-border-default');
	});

	it('썸네일을 불러오지 못하면 팀 커버 기본 이미지를 표시한다', () => {
		render(<PostFeedCard post={PERSONAL_POST} position={1} />);

		const thumbnail = screen.getByRole('img', { name: '함께 기록하는 방법 썸네일' });
		fireEvent.error(thumbnail);

		expect(new URL(thumbnail.getAttribute('src')!, 'http://localhost').pathname).toBe('/images/thumbnail-fallback.svg');
	});

	it('썸네일 URL이 없으면 처음부터 팀 커버 기본 이미지를 표시한다', () => {
		render(<PostFeedCard post={{ ...PERSONAL_POST, thumbnailUrl: null }} position={1} />);

		const postCard = screen.getByRole('link', { name: /함께 기록하는 방법/ });
		expect(
			new URL(screen.getByRole('img', { name: '함께 기록하는 방법 썸네일' }).getAttribute('src')!, 'http://localhost')
				.pathname,
		).toBe('/images/thumbnail-fallback.svg');
		expect(postCard.querySelector('article > div')).toHaveClass('bg-thumbnail-background');
		expect(screen.getByRole('heading', { name: '함께 기록하는 방법' }).parentElement).toHaveClass('mt-2');
		expect(screen.getByRole('img', { name: '함께 기록하는 방법 썸네일' })).not.toHaveClass(
			'object-contain',
			'p-10',
			'sm:p-12',
		);
		expect(screen.getByRole('img', { name: '함께 기록하는 방법 썸네일' }).parentElement).not.toHaveClass(
			'border',
			'border-border-default',
		);
	});

	it('Colog 글에만 팀 이름 배지를 표시한다', () => {
		const { rerender } = render(<PostFeedCard post={PERSONAL_POST} position={1} />);

		expect(screen.queryByText('리로그 팀')).not.toBeInTheDocument();

		rerender(
			<PostFeedCard
				position={1}
				post={{
					...PERSONAL_POST,
					blog: {
						id: 1,
						name: '리로그 팀',
						slug: 'rilog-team',
						type: 'COLOG',
						profileImageUrl: 'https://images.rilog.test/team.png',
					},
				}}
			/>,
		);

		expect(screen.getByText('리로그 팀')).toBeInTheDocument();
		const cologLogoUrl = screen.getByRole('img', { name: '리로그 팀' }).getAttribute('src');
		const parsedCologLogoUrl = new URL(cologLogoUrl!, 'http://localhost');

		expect(parsedCologLogoUrl.searchParams.get('url') ?? parsedCologLogoUrl.href).toContain(
			'https://images.rilog.test/team.png',
		);
		expect(screen.getByRole('img', { name: '리로그 팀' }).parentElement).toHaveClass(
			'rounded-md',
			'border',
			'border-border-default',
		);
	});

	it('상세 링크를 활성화하면 피드 진입 context를 기록한다', () => {
		render(<PostFeedCard post={PERSONAL_POST} position={3} />);

		fireEvent.click(screen.getByRole('link', { name: /함께 기록하는 방법/ }));

		expect(window.sessionStorage.getItem('rilog.post-detail-entry-context')).toBe(
			JSON.stringify({
				postId: 17,
				entrySource: 'feed',
				feedPosition: 3,
			}),
		);
	});
});
