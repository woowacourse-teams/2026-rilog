import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { PostFeedItem } from '@/domains/post/model/post';

import PostFeedCard from './PostFeedCard';

const PERSONAL_POST: PostFeedItem = {
	id: 17,
	chapterName: null,
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
	beforeEach(() => window.sessionStorage.clear());

	it('개인 글 카드와 작성자 프로필을 각각 상세와 개인 홈으로 연결한다', () => {
		render(
			<PostFeedCard
				post={{
					...PERSONAL_POST,
					chapterName: 'Education',
					blog: { ...PERSONAL_POST.blog, slug: 'different-owner' },
				}}
				position={3}
			/>,
		);
		expect(screen.getAllByRole('link')).toHaveLength(2);
		expect(screen.getByRole('link', { name: '함께 기록하는 방법' })).toHaveAttribute(
			'href',
			'/@different-owner/posts/17',
		);
		expect(screen.getByRole('img', { name: '리로거 프로필' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /리로거/ })).toHaveAttribute('href', '/@rilogger');
		expect(screen.getByText('Education').closest('a, button')).toBeNull();
		expect(screen.getByText('2026년 8월 5일')).toHaveAttribute('datetime', '2026-08-04T23:59:59.000Z');
	});

	it('작성자 프로필 이미지가 있으면 표시한다', () => {
		render(
			<PostFeedCard
				position={1}
				post={{
					...PERSONAL_POST,
					author: { ...PERSONAL_POST.author, profileImageUrl: 'https://images.rilog.test/profile.png' },
				}}
			/>,
		);
		expect(screen.getByRole('img', { name: '리로거 프로필' }).querySelector('img')).toHaveAttribute(
			'src',
			'https://images.rilog.test/profile.png',
		);
	});

	it.each([null, 'https://images.rilog.test/broken.png'])(
		'누락되거나 실패한 썸네일 %s에 기본 이미지를 표시한다',
		(thumbnailUrl) => {
			render(<PostFeedCard post={{ ...PERSONAL_POST, thumbnailUrl }} position={1} />);
			const image = screen.getByRole('img', { name: '함께 기록하는 방법 썸네일' });
			if (thumbnailUrl) fireEvent.error(image);
			expect(new URL(image.getAttribute('src')!, 'http://localhost').pathname).toBe('/images/thumbnail-fallback.svg');
		},
	);

	it('코로그 로고와 이름은 코로그 홈으로 연결하고 챕터는 링크 밖에 표시한다', () => {
		render(
			<PostFeedCard
				position={1}
				post={{
					...PERSONAL_POST,
					chapterName: 'FE',
					blog: {
						...PERSONAL_POST.blog,
						type: 'COLOG',
						name: '리로그 팀',
						slug: 'rilog-team',
						profileImageUrl: 'https://images.rilog.test/team.png',
					},
				}}
			/>,
		);
		expect(screen.getAllByRole('link')).toHaveLength(2);
		const home = screen.getByRole('link', { name: /리로그 팀/ });
		expect(home).toHaveAttribute('href', '/@rilog-team');
		expect(home).toContainElement(screen.getByRole('img', { name: '리로그 팀' }));
		expect(screen.queryByText('리로거')).not.toBeInTheDocument();
		expect(screen.getByText('FE').closest('a')).toBeNull();
		fireEvent.click(home);
		expect(window.sessionStorage.getItem('rilog.post-detail-entry-context')).toBeNull();
	});

	it.each(['RILOG', 'COLOG'] as const)('%s는 챕터나 시리즈가 없어도 이름 뒤에 점을 표시한다', (type) => {
		render(<PostFeedCard post={{ ...PERSONAL_POST, blog: { ...PERSONAL_POST.blog, type } }} position={1} />);
		expect(screen.getByText('.')).toBeInTheDocument();
	});

	it('상세 링크를 활성화하면 피드 진입 context를 기록한다', () => {
		render(<PostFeedCard post={PERSONAL_POST} position={3} />);
		fireEvent.click(screen.getByRole('link', { name: '함께 기록하는 방법' }));
		expect(JSON.parse(window.sessionStorage.getItem('rilog.post-detail-entry-context')!)).toEqual({
			postId: 17,
			entrySource: 'feed',
			feedPosition: 3,
		});
	});
});
