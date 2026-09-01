import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import type { PublicBlogPostsFilter } from '@/shared/api/blogs/types';

import BlogHomePage from './page';

const { notFoundMock, readBlogIndexMock, readBlogPublicProfileMock, readPublicBlogPostsMock } = vi.hoisted(() => ({
	notFoundMock: vi.fn((): never => {
		throw new Error('NEXT_NOT_FOUND');
	}),
	readBlogIndexMock: vi.fn(),
	readBlogPublicProfileMock: vi.fn(),
	readPublicBlogPostsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));

vi.mock('@/shared/api/blogs/api', () => ({
	readBlogIndex: readBlogIndexMock,
	readBlogPublicProfile: readBlogPublicProfileMock,
	readPublicBlogPosts: readPublicBlogPostsMock,
}));

vi.mock('@/widgets/blog-home/ui/BlogHome', () => ({
	default: function MockBlogHome({
		profile,
		filter,
		postsFilter,
		initialIndexRequestFailed,
		initialPostsRequestFailed,
	}: {
		profile: BlogPublicProfile;
		filter: PublicBlogPostsFilter;
		postsFilter: PublicBlogPostsFilter;
		initialIndexRequestFailed: boolean;
		initialPostsRequestFailed: boolean;
	}) {
		return (
			<div>{`${profile.type}:${profile.slug}:${JSON.stringify(filter)}:${JSON.stringify(postsFilter)}:${initialIndexRequestFailed}:${initialPostsRequestFailed}`}</div>
		);
	},
}));

const RILOG_RESPONSE = {
	type: 'RILOG' as const,
	id: 2,
	name: '파라디',
	slug: 'jetproc',
	introduction: '기록하며 성장합니다.',
	profileImageUrl: null,
	coverImageUrl: 'https://images.rilog.test/default-cover.png',
	serviceUrl: null,
	githubUrl: 'https://github.com/jetproc',
	memberCount: 1,
	postCount: 7,
};

const INDEX_RESPONSE = {
	blogType: 'RILOG' as const,
	totalCount: 7,
	chapterIndexes: [{ chapterId: 3, name: '회고', postCount: 4 }],
	cologIndexes: [
		{
			cologId: 7,
			slug: 'rilog-team',
			name: '리로그 팀',
			profileImageUrl: null,
			authoredPostCount: 3,
		},
	],
};

const POSTS_RESPONSE = {
	type: 'RILOG' as const,
	posts: [],
	page: 0,
	size: 12,
	numberOfElements: 0,
	hasNext: false,
};

const renderPage = async (slug = '@jetproc', searchParams: Record<string, string | string[] | undefined> = {}) => {
	const page = await BlogHomePage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve(searchParams) });
	return render(<QueryClientProvider client={new QueryClient()}>{page}</QueryClientProvider>);
};

describe('BlogHomePage', () => {
	beforeEach(() => {
		notFoundMock.mockClear();
		readBlogPublicProfileMock.mockReset();
		readBlogIndexMock.mockReset();
		readPublicBlogPostsMock.mockReset();
		readBlogPublicProfileMock.mockResolvedValue({ status: 200, message: 'OK', data: RILOG_RESPONSE });
		readBlogIndexMock.mockResolvedValue({ status: 200, message: 'OK', data: INDEX_RESPONSE });
		readPublicBlogPostsMock.mockResolvedValue({ status: 200, message: 'OK', data: POSTS_RESPONSE });
	});

	it('페이지 단일 query cache에서 프로필·인덱스·필터 게시글을 조회한다', async () => {
		await renderPage('@jetproc', { colog: 'rilog-team' });

		expect(readBlogPublicProfileMock).toHaveBeenCalledOnce();
		expect(readBlogPublicProfileMock).toHaveBeenCalledWith({ slug: 'jetproc' });
		expect(readBlogIndexMock).toHaveBeenCalledWith('jetproc');
		expect(readPublicBlogPostsMock).toHaveBeenCalledWith({
			slug: 'jetproc',
			page: 0,
			size: 12,
			filter: { type: 'targetCologSlug', targetCologSlug: 'rilog-team' },
		});
		expect(
			screen.getByText(
				'RILOG:jetproc:{"type":"targetCologSlug","targetCologSlug":"rilog-team"}:{"type":"targetCologSlug","targetCologSlug":"rilog-team"}:false:false',
			),
		).toBeInTheDocument();
	});

	it('인덱스에 속하지 않는 필터는 not-found 처리한다', async () => {
		await expect(
			BlogHomePage({
				params: Promise.resolve({ slug: '@jetproc' }),
				searchParams: Promise.resolve({ series: '99', notice: 'keep' }),
			}),
		).rejects.toThrow('NEXT_NOT_FOUND');

		expect(readPublicBlogPostsMock).not.toHaveBeenCalled();
		expect(notFoundMock).toHaveBeenCalledOnce();
	});

	it('인덱스 실패 중에는 URL 필터를 유지하되 전체 게시글을 조회한다', async () => {
		readBlogIndexMock.mockRejectedValue(new Error('index failed'));

		await renderPage('@jetproc', { series: '99' });

		expect(readPublicBlogPostsMock).toHaveBeenCalledWith(expect.objectContaining({ filter: { type: 'all' } }));
		expect(
			screen.getByText('RILOG:jetproc:{"type":"chapterId","chapterId":99}:{"type":"all"}:true:false'),
		).toBeInTheDocument();
	});

	it('공개 프로필 data가 없으면 not-found 처리한다', async () => {
		readBlogPublicProfileMock.mockResolvedValue({ status: 200, message: 'OK' });

		await expect(
			BlogHomePage({ params: Promise.resolve({ slug: '@missing' }), searchParams: Promise.resolve({}) }),
		).rejects.toThrow('NEXT_NOT_FOUND');
		expect(notFoundMock).toHaveBeenCalledOnce();
	});

	it('지원하지 않는 공개 프로필 type이면 not-found 처리한다', async () => {
		readBlogPublicProfileMock.mockResolvedValue({
			status: 200,
			message: 'OK',
			data: { ...RILOG_RESPONSE, type: 'UNKNOWN' },
		});

		await expect(
			BlogHomePage({ params: Promise.resolve({ slug: '@jetproc' }), searchParams: Promise.resolve({}) }),
		).rejects.toThrow('NEXT_NOT_FOUND');
		expect(notFoundMock).toHaveBeenCalledOnce();
	});

	it('@ 접두사가 없는 경로에서는 프로필을 조회하지 않고 not-found 처리한다', async () => {
		await expect(
			BlogHomePage({ params: Promise.resolve({ slug: 'jetproc' }), searchParams: Promise.resolve({}) }),
		).rejects.toThrow('NEXT_NOT_FOUND');

		expect(readBlogPublicProfileMock).not.toHaveBeenCalled();
		expect(notFoundMock).toHaveBeenCalledOnce();
	});

	it.each([{ chapterId: '3' }, { targetCologSlug: 'rilog-team' }, { series: ['3', '4'] }, { series: '0' }])(
		'잘못된 필터 query %o는 not-found 처리한다',
		async (invalidSearchParams) => {
			await expect(
				BlogHomePage({
					params: Promise.resolve({ slug: '@jetproc' }),
					searchParams: Promise.resolve(invalidSearchParams),
				}),
			).rejects.toThrow('NEXT_NOT_FOUND');

			expect(readPublicBlogPostsMock).not.toHaveBeenCalled();
			expect(notFoundMock).toHaveBeenCalledOnce();
		},
	);
});
