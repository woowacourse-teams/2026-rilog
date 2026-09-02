import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prefetchBlogHomeInitialState } from './prefetch-blog-home-initial-state';

const { readBlogIndexMock, readBlogPublicProfileMock, readPublicBlogPostsMock } = vi.hoisted(() => ({
	readBlogIndexMock: vi.fn(),
	readBlogPublicProfileMock: vi.fn(),
	readPublicBlogPostsMock: vi.fn(),
}));

vi.mock('@/shared/api/blogs/api', () => ({
	readBlogIndex: readBlogIndexMock,
	readBlogPublicProfile: readBlogPublicProfileMock,
	readPublicBlogPosts: readPublicBlogPostsMock,
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

const createQueryClient = () => new QueryClient();

describe('prefetchBlogHomeInitialState', () => {
	beforeEach(() => {
		readBlogPublicProfileMock.mockReset();
		readBlogIndexMock.mockReset();
		readPublicBlogPostsMock.mockReset();
		readBlogPublicProfileMock.mockResolvedValue({ status: 200, message: 'OK', data: RILOG_RESPONSE });
		readBlogIndexMock.mockResolvedValue({ status: 200, message: 'OK', data: INDEX_RESPONSE });
		readPublicBlogPostsMock.mockResolvedValue({ status: 200, message: 'OK', data: POSTS_RESPONSE });
	});

	it('프로필·인덱스·필터 게시글을 같은 query cache에 준비한다', async () => {
		const result = await prefetchBlogHomeInitialState(createQueryClient(), {
			slug: 'jetproc',
			searchParams: { colog: 'rilog-team' },
		});

		expect(readBlogPublicProfileMock).toHaveBeenCalledWith({ slug: 'jetproc' });
		expect(readBlogIndexMock).toHaveBeenCalledWith('jetproc');
		expect(readPublicBlogPostsMock).toHaveBeenCalledWith({
			slug: 'jetproc',
			page: 0,
			size: 12,
			filter: { type: 'targetCologSlug', targetCologSlug: 'rilog-team' },
		});
		expect(result).toMatchObject({
			status: 'ready',
			profile: { type: 'RILOG', slug: 'jetproc' },
			filter: { type: 'targetCologSlug', targetCologSlug: 'rilog-team' },
			postsFilter: { type: 'targetCologSlug', targetCologSlug: 'rilog-team' },
			isInitialIndexRequestFailed: false,
			isInitialPostsRequestFailed: false,
		});
	});

	it('인덱스에 속하지 않는 필터는 not-found로 결정한다', async () => {
		const result = await prefetchBlogHomeInitialState(createQueryClient(), {
			slug: 'jetproc',
			searchParams: { series: '99' },
		});

		expect(result).toEqual({ status: 'not-found' });
		expect(readPublicBlogPostsMock).not.toHaveBeenCalled();
	});

	it('인덱스 실패 중에는 URL 필터를 유지하고 전체 게시글을 준비한다', async () => {
		readBlogIndexMock.mockRejectedValue(new Error('index failed'));

		const result = await prefetchBlogHomeInitialState(createQueryClient(), {
			slug: 'jetproc',
			searchParams: { series: '99' },
		});

		expect(readPublicBlogPostsMock).toHaveBeenCalledWith(expect.objectContaining({ filter: { type: 'all' } }));
		expect(result).toMatchObject({
			status: 'ready',
			filter: { type: 'chapterId', chapterId: 99 },
			postsFilter: { type: 'all' },
			isInitialIndexRequestFailed: true,
		});
	});

	it.each([{ profileData: undefined }, { profileData: { ...RILOG_RESPONSE, type: 'UNKNOWN' } }])(
		'공개 프로필 계약이 유효하지 않으면 not-found로 결정한다',
		async ({ profileData }) => {
			readBlogPublicProfileMock.mockResolvedValue({ status: 200, message: 'OK', data: profileData });

			const result = await prefetchBlogHomeInitialState(createQueryClient(), {
				slug: 'jetproc',
				searchParams: {},
			});

			expect(result).toEqual({ status: 'not-found' });
		},
	);

	it.each([{ chapterId: '3' }, { targetCologSlug: 'rilog-team' }, { series: ['3', '4'] }, { series: '0' }])(
		'잘못된 필터 query %o는 not-found로 결정한다',
		async (searchParams) => {
			const result = await prefetchBlogHomeInitialState(createQueryClient(), {
				slug: 'jetproc',
				searchParams,
			});

			expect(result).toEqual({ status: 'not-found' });
			expect(readPublicBlogPostsMock).not.toHaveBeenCalled();
		},
	);

	it('게시글 prefetch가 실패하면 초기 오류 상태를 반환한다', async () => {
		readPublicBlogPostsMock.mockRejectedValue(new Error('posts failed'));

		const result = await prefetchBlogHomeInitialState(createQueryClient(), {
			slug: 'jetproc',
			searchParams: {},
		});

		expect(result).toMatchObject({ status: 'ready', isInitialPostsRequestFailed: true });
	});
});
