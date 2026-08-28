import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PostSummary } from '@/domains/post/model/post';

import BlogPostList from './BlogPostList';

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

describe('BlogPostList', () => {
	it('전달받은 공개 블로그 게시글을 상세 경로와 함께 렌더링한다', () => {
		render(<BlogPostList slug="rilog" posts={POST_FIXTURES} />);

		expect(screen.getAllByRole('link')).toHaveLength(2);
		expect(screen.getByRole('link', { name: /접근 가능한 인터페이스 만들기/ })).toHaveAttribute(
			'href',
			'/@rilog/posts/101',
		);
		expect(screen.getByText('2026년 8월 16일')).toHaveAttribute('datetime', '2026-08-16');
		expect(screen.getByRole('img', { name: '접근 가능한 인터페이스 만들기 썸네일' })).toBeInTheDocument();
	});

	it('게시글이 없으면 공통 빈 상태를 렌더링한다', () => {
		render(<BlogPostList slug="rilog" posts={[]} />);

		expect(screen.getByText('아직 작성된 게시글이 없습니다.')).toBeInTheDocument();
		expect(screen.queryByRole('list')).not.toBeInTheDocument();
	});

	it('상세 링크를 활성화하면 블로그 프로필 진입 context를 기록한다', () => {
		render(<BlogPostList slug="rilog" posts={POST_FIXTURES} />);

		fireEvent.click(screen.getByRole('link', { name: /디자인 토큰 운영 기록/ }));

		expect(window.sessionStorage.getItem('rilog.post-detail-entry-context')).toBe(
			JSON.stringify({
				postId: 102,
				entrySource: 'blog_profile',
				feedPosition: 2,
			}),
		);
	});
});
