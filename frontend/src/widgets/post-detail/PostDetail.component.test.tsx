import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import type { PostDetail as PostDetailModel } from '@/domains/post/model/post';

import PostDetail from './PostDetail';

vi.mock('./BasePostDetail', () => ({
	default: function MockBasePostDetail({
		header,
		profileSection,
		beforeContent,
		afterProfile,
	}: {
		header: ReactNode;
		profileSection: ReactNode;
		beforeContent?: ReactNode;
		afterProfile?: ReactNode;
	}) {
		return (
			<main>
				{header}
				{beforeContent}
				{profileSection}
				{afterProfile}
			</main>
		);
	},
}));
vi.mock('@/features/post-detail/ui/PostDetailHeader', () => ({
	default: function MockPostDetailHeader({ publisher }: { publisher?: ReactNode }) {
		return (
			<div>
				{publisher}
				상세 헤더
			</div>
		);
	},
}));
vi.mock('@/features/post-detail/ui/PostDetailBlogProfileSection', () => ({
	default: function MockPostDetailBlogProfileSection() {
		return <div>블로그 프로필</div>;
	},
}));
vi.mock('@/features/post-detail/ui/PostDetailAuthorProfileSection', () => ({
	default: function MockPostDetailAuthorProfileSection() {
		return <div>작성자 프로필</div>;
	},
}));
vi.mock('@/features/post-detail/ui/SeriesAccordionSection', () => ({
	default: function MockSeriesAccordionSection() {
		return <div>시리즈 글</div>;
	},
}));
vi.mock('@/features/post-detail/ui/ChapterPostSuggestionSection', () => ({
	default: function MockChapterPostSuggestionSection() {
		return <div>챕터 글</div>;
	},
}));

const BASE_POST: Omit<PostDetailModel, 'blog'> = {
	id: 72,
	title: '게시글 제목',
	content: [],
	publishedAt: '2026-09-01T00:00:00+09:00',
	thumbnailUrl: null,
	category: 'IT',
	chapter: { id: 3, name: '프론트엔드', order: 1 },
	viewerPermissions: { canEdit: true, canDelete: true },
	author: {
		id: 1,
		nickname: '파라디',
		slug: 'jetproc',
		profileImageUrl: null,
		description: '기록하며 성장하는 개발자입니다.',
	},
};

describe('PostDetail', () => {
	it('Rilog 글에는 시리즈를 본문 위에 표시하고 별도 작성자 프로필은 표시하지 않는다', () => {
		const post = {
			...BASE_POST,
			blog: {
				id: 1,
				type: 'RILOG',
				name: '파라디',
				slug: 'jetproc',
				profileImageUrl: null,
				owner: BASE_POST.author,
			},
		} satisfies PostDetailModel;

		render(<PostDetail post={post} />);

		expect(screen.getByText('상세 헤더')).toBeInTheDocument();
		expect(screen.getByText('블로그 프로필')).toBeInTheDocument();
		expect(screen.getByText('시리즈 글')).toBeInTheDocument();
		expect(screen.queryByText('챕터 글')).not.toBeInTheDocument();
		expect(screen.queryByText('작성자 프로필')).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /파라디/ })).not.toBeInTheDocument();
	});

	it('Colog 글에는 작성자 프로필과 챕터 글을 표시하고 시리즈는 표시하지 않는다', () => {
		const post = {
			...BASE_POST,
			blog: {
				id: 9,
				type: 'COLOG',
				name: '리로그 팀',
				slug: 'rilog-team',
				profileImageUrl: null,
				coverImageUrl: null,
			},
		} satisfies PostDetailModel;

		render(<PostDetail post={post} />);

		expect(screen.getByText('블로그 프로필')).toBeInTheDocument();
		expect(screen.getByText('작성자 프로필')).toBeInTheDocument();
		expect(screen.getByText('챕터 글')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /리로그 팀/ })).toHaveAttribute('href', '/@rilog-team');
		expect(screen.queryByText('시리즈 글')).not.toBeInTheDocument();
	});

	it('챕터에 속하지 않은 글에는 시리즈와 챕터 글을 표시하지 않는다', () => {
		const post = {
			...BASE_POST,
			chapter: null,
			blog: {
				id: 1,
				type: 'RILOG',
				name: '파라디',
				slug: 'jetproc',
				profileImageUrl: null,
				owner: BASE_POST.author,
			},
		} satisfies PostDetailModel;

		render(<PostDetail post={post} />);

		expect(screen.queryByText('시리즈 글')).not.toBeInTheDocument();
		expect(screen.queryByText('챕터 글')).not.toBeInTheDocument();
	});
});
