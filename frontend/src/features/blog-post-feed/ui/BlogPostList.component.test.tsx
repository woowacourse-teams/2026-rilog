import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import type { PostFeedItem } from '@/domains/post/model/post';

import BlogPostList from './BlogPostList';

const POST_FIXTURES: PostFeedItem[] = [
	{
		id: 101,
		chapterName: null,
		title: '접근 가능한 인터페이스 만들기',
		thumbnailUrl: 'https://images.rilog.test/post.png',
		publishedAt: '2026-08-16',
		author: { id: 1, nickname: '새봄', slug: 'saebom', profileImageUrl: '/images/saebom.png' },
		blog: { id: 1, name: '새봄', slug: 'saebom', type: 'RILOG', profileImageUrl: null },
	},
	{
		id: 102,
		chapterName: null,
		title: '디자인 토큰 운영 기록',
		thumbnailUrl: null,
		publishedAt: '2026-08-15',
		author: { id: 2, nickname: '여름', slug: 'summer', profileImageUrl: null },
		blog: { id: 2, name: '여름', slug: 'summer', type: 'RILOG', profileImageUrl: null },
	},
];

describe('BlogPostList', () => {
	beforeEach(() => window.sessionStorage.clear());
	it('전달받은 공개 블로그 게시글을 상세 경로와 함께 렌더링한다', () => {
		render(<BlogPostList blogType="RILOG" slug="rilog" posts={POST_FIXTURES} />);

		expect(screen.getAllByRole('link')).toHaveLength(2);
		expect(screen.getByRole('link', { name: /접근 가능한 인터페이스 만들기/ })).toHaveAttribute(
			'href',
			'/@rilog/posts/101',
		);
		expect(screen.getByText('2026년 8월 16일')).toHaveAttribute('datetime', '2026-08-16T00:00:00.000Z');
		expect(screen.getByRole('img', { name: '접근 가능한 인터페이스 만들기 썸네일' })).toBeInTheDocument();
		expect(screen.queryByRole('img', { name: '새봄 프로필' })).not.toBeInTheDocument();
	});

	it('게시글이 없으면 공통 빈 상태를 렌더링한다', () => {
		render(<BlogPostList blogType="RILOG" slug="rilog" posts={[]} />);

		expect(screen.getByText('아직 작성된 게시글이 없습니다.')).toBeInTheDocument();
		expect(screen.queryByRole('list')).not.toBeInTheDocument();
	});

	it('상세 링크를 활성화하면 블로그 프로필 진입 context를 기록한다', () => {
		render(<BlogPostList blogType="RILOG" slug="rilog" posts={POST_FIXTURES} />);

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

describe('공통 블로그 홈 게시글 행', () => {
	beforeEach(() => window.sessionStorage.clear());

	it('이름과 시리즈, 카테고리를 포함한 카드 전체를 상세 링크로 제공한다', async () => {
		const user = userEvent.setup();
		render(
			<BlogPostList
				blogType="COLOG"
				slug="team"
				posts={[{ ...POST_FIXTURES[0], chapterName: '개발 기록', categoryLabel: '기술' }]}
			/>,
		);
		const cardLink = screen.getByRole('link', { name: /접근 가능한 인터페이스 만들기/ });
		expect(cardLink).toHaveAttribute('href', '/@team/posts/101');
		for (const info of [
			screen.getByText('새봄'),
			screen.getByText('개발 기록'),
			screen.getByRole('img', { name: '새봄 프로필' }),
			screen.getByText('기술'),
			screen.getByText('2026년 8월 16일'),
		]) {
			expect(info.closest('a')).toBe(cardLink);
		}
		expect(screen.getByText('.')).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 3, name: '접근 가능한 인터페이스 만들기' })).toBeInTheDocument();
		await user.click(screen.getByText('기술'));
		expect(JSON.parse(window.sessionStorage.getItem('rilog.post-detail-entry-context')!)).toEqual({
			postId: 101,
			entrySource: 'blog_profile',
			feedPosition: 1,
		});
		expect(screen.getAllByRole('link')).toHaveLength(1);
	});

	it('시리즈가 없으면 이름 뒤 점을 유지하고 카테고리가 없으면 날짜 앞 구분점을 생략한다', () => {
		render(<BlogPostList blogType="COLOG" slug="team" posts={[POST_FIXTURES[0]]} />);
		expect(screen.getByText('.')).toBeInTheDocument();
		expect(screen.queryByText('·')).not.toBeInTheDocument();
		expect(screen.getByText('2026년 8월 16일')).toHaveAttribute('datetime', '2026-08-16T00:00:00.000Z');
	});

	it.each(['RILOG', 'COLOG'] as const)('%s 홈에서 키보드 탭은 각 게시글 카드를 한 번씩 방문한다', async (blogType) => {
		const user = userEvent.setup();
		render(<BlogPostList blogType={blogType} slug="team" posts={POST_FIXTURES} />);
		expect(screen.getAllByRole('link')).toHaveLength(2);
		for (const link of screen.getAllByRole('link')) {
			await user.tab();
			expect(link).toHaveFocus();
		}
	});

	it('개인 홈에서 글 유형과 챕터 유무에 맞는 네 가지 메타 조합을 이미지 없이 표시한다', () => {
		const posts = [
			{
				...POST_FIXTURES[0],
				chapterName: '개인 시리즈',
				categoryLabel: '기술',
			},
			{
				...POST_FIXTURES[1],
				author: { ...POST_FIXTURES[1].author, nickname: '개인 작성자' },
			},
			{
				...POST_FIXTURES[0],
				id: 103,
				title: '코로그 챕터 글',
				chapterName: '코로그 챕터',
				blog: { type: 'COLOG' as const, id: 3, name: '리로그 팀', slug: 'team', profileImageUrl: '/team.png' },
			},
			{
				...POST_FIXTURES[1],
				id: 104,
				title: '코로그 단독 글',
				blog: {
					type: 'COLOG' as const,
					id: 4,
					name: '프론트엔드 팀',
					slug: 'frontend',
					profileImageUrl: '/frontend.png',
				},
			},
		];
		render(<BlogPostList blogType="RILOG" slug="saebom" posts={posts} />);

		expect(screen.getAllByRole('link')).toHaveLength(4);
		expect(screen.getByText('새봄').closest('a')).toHaveAttribute('href', '/@saebom/posts/101');
		expect(screen.getByText('개인 시리즈')).toBeInTheDocument();
		expect(screen.getByText('개인 작성자')).toBeInTheDocument();
		expect(screen.getByText('리로그 팀')).toBeInTheDocument();
		expect(screen.getByText('코로그 챕터')).toBeInTheDocument();
		expect(screen.getByText('프론트엔드 팀')).toBeInTheDocument();
		expect(screen.getAllByText('.')).toHaveLength(4);
		expect(screen.getByText('기술')).toBeInTheDocument();
		expect(screen.getAllByRole('img')).toHaveLength(4);
		expect(screen.queryByRole('img', { name: /프로필/ })).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 3, name: '접근 가능한 인터페이스 만들기' })).toBeInTheDocument();
	});

	it('개인 홈의 긴 이름과 챕터는 각각 말줄임 영역을 유지한다', () => {
		const longName = '아주 긴 코로그 이름을 가진 프론트엔드 아키텍처 연구 모임';
		const longChapter = '아주 긴 챕터 이름을 가진 렌더링 성능 개선 연재';
		render(
			<BlogPostList
				blogType="RILOG"
				slug="saebom"
				posts={[
					{
						...POST_FIXTURES[0],
						chapterName: longChapter,
						blog: { type: 'COLOG', id: 3, name: longName, slug: 'team', profileImageUrl: null },
					},
				]}
			/>,
		);

		expect(screen.getByText(longName)).toHaveClass('truncate');
		expect(screen.getByText(longChapter)).toHaveClass('truncate');
	});
});
