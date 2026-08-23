import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PostSummary } from '@/domains/post/model/post';

import { usePublicBlogPosts } from '../hooks/use-public-blog-posts';

import CologPostFeed from './CologPostFeed';

vi.mock('../hooks/use-public-blog-posts');

const POST_FIXTURES: PostSummary[] = [
	{
		id: 101,
		title: '접근 가능한 인터페이스 만들기',
		thumbnailUrl: 'https://images.rilog.test/post.png',
		publishedAt: '2026-08-16',
		author: { id: 1, nickname: '새봄', slug: 'saebom', profileImageUrl: '/images/saebom.png' },
	},
	{
		id: 102,
		title: '디자인 토큰 운영 기록',
		thumbnailUrl: null,
		publishedAt: '2026-08-15',
		author: { id: 2, nickname: '여름', slug: 'summer', profileImageUrl: null },
	},
];

type PublicBlogPostsResult = ReturnType<typeof usePublicBlogPosts>;

const createPublicBlogPostsResult = (items: PostSummary[]): PublicBlogPostsResult =>
	({
		data: { pages: [{ items, page: 0, hasNext: false }] },
		fetchNextPage: vi.fn(),
		hasNextPage: false,
		isFetchingNextPage: false,
		isFetchNextPageError: false,
		isPending: false,
		isError: false,
	}) as unknown as PublicBlogPostsResult;

describe('CologPostFeed', () => {
	it('전달받은 게시글만 렌더링한다', () => {
		vi.mocked(usePublicBlogPosts).mockReturnValue(createPublicBlogPostsResult(POST_FIXTURES));

		render(<CologPostFeed slug="rilog" />);

		const postSection = screen.getByRole('region', { name: '코로그 게시글' });
		expect(within(postSection).getAllByRole('link')).toHaveLength(2);
		expect(within(postSection).getByRole('link', { name: /접근 가능한 인터페이스 만들기/ })).toHaveAttribute(
			'href',
			'/@rilog/posts/101',
		);
		expect(within(postSection).getByText('2026년 8월 16일')).toBeInTheDocument();
		expect(within(postSection).getByRole('img', { name: '접근 가능한 인터페이스 만들기 썸네일' })).toHaveAttribute(
			'src',
			expect.stringContaining(encodeURIComponent('https://images.rilog.test/post.png')),
		);
		expect(
			new URL(
				within(postSection).getByRole('img', { name: '디자인 토큰 운영 기록 썸네일' }).getAttribute('src')!,
				'http://localhost',
			).pathname,
		).toBe('/images/thumbnail-fallback.svg');
		expect(within(postSection).getByRole('img', { name: '디자인 토큰 운영 기록 썸네일' })).not.toHaveClass(
			'object-contain',
			'p-5',
		);
		expect(
			within(postSection).getByRole('img', { name: '디자인 토큰 운영 기록 썸네일' }).parentElement,
		).not.toHaveClass('border', 'border-border-default');
	});

	it('게시글이 없으면 빈 상태를 제공한다', () => {
		vi.mocked(usePublicBlogPosts).mockReturnValue(createPublicBlogPostsResult([]));

		render(<CologPostFeed slug="rilog" />);

		expect(screen.getByText('아직 작성된 게시글이 없습니다.')).toBeInTheDocument();
	});
});
