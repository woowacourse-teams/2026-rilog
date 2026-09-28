import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlogHomeInitialState } from '@/features/blog-home-index/server/prefetch-blog-home-initial-state';
import { prefetchBlogHomeInitialState } from '@/features/blog-home-index/server/prefetch-blog-home-initial-state';
import { getBlogPublicProfile } from '@/features/blog-profile/lib/get-blog-public-profile';
import { createTestQueryClient } from '@/test/render-with-query';

import BlogHomePage, { generateMetadata } from './page';

const { notFoundMock, permanentRedirectMock } = vi.hoisted(() => ({
	notFoundMock: vi.fn((): never => {
		throw new Error('NEXT_NOT_FOUND');
	}),
	permanentRedirectMock: vi.fn((): never => {
		throw new Error('NEXT_REDIRECT');
	}),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock, permanentRedirect: permanentRedirectMock }));
vi.mock('@/features/blog-home-index/server/prefetch-blog-home-initial-state');
vi.mock('@/features/blog-profile/lib/get-blog-public-profile');

vi.mock('@/widgets/blog-home/ui/BlogHome', () => ({
	default: function MockBlogHome() {
		return <div>블로그 홈</div>;
	},
}));

const READY_STATE: BlogHomeInitialState = {
	status: 'ready',
	profile: {
		type: 'RILOG',
		id: 2,
		name: '파라디',
		slug: 'jetproc',
		profileImageUrl: null,
		coverImageUrl: null,
		memberCount: 1,
		postCount: 7,
	},
	filter: { type: 'all' },
	isInitialIndexRequestFailed: false,
	isInitialPostsRequestFailed: false,
};

const PROFILE_RESPONSE = {
	status: 200,
	message: '블로그 프로필을 조회했습니다.',
	data: {
		type: 'RILOG' as const,
		id: 2,
		name: '파라디',
		slug: 'jetproc',
		introduction: null,
		profileImageUrl: null,
		coverImageUrl: null,
		serviceUrl: null,
		githubUrl: null,
		memberCount: 1,
		postCount: 7,
	},
};

const renderPage = async (slug = '@jetproc', searchParams: Record<string, string | string[] | undefined> = {}) => {
	const page = await BlogHomePage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve(searchParams) });
	return render(<QueryClientProvider client={createTestQueryClient()}>{page}</QueryClientProvider>);
};

describe('BlogHomePage', () => {
	beforeEach(() => {
		notFoundMock.mockClear();
		permanentRedirectMock.mockClear();
		vi.mocked(prefetchBlogHomeInitialState).mockReset();
		vi.mocked(prefetchBlogHomeInitialState).mockResolvedValue(READY_STATE);
		vi.mocked(getBlogPublicProfile).mockReset();
		vi.mocked(getBlogPublicProfile).mockResolvedValue({ profile: READY_STATE.profile, response: PROFILE_RESPONSE });
	});

	it('정규화한 route 입력으로 블로그 홈 초기 상태를 준비하고 화면을 조립한다', async () => {
		await renderPage('@jetproc', { notice: 'keep' });

		expect(prefetchBlogHomeInitialState).toHaveBeenCalledWith(expect.any(QueryClient), {
			slug: 'jetproc',
			searchParams: { notice: 'keep' },
			profileResponse: PROFILE_RESPONSE,
		});
		expect(screen.getByText('블로그 홈')).toBeInTheDocument();
	});

	it('feature가 not-found 상태를 반환하면 Next not-found로 연결한다', async () => {
		vi.mocked(prefetchBlogHomeInitialState).mockResolvedValue({ status: 'not-found' });

		await expect(
			BlogHomePage({ params: Promise.resolve({ slug: '@missing' }), searchParams: Promise.resolve({}) }),
		).rejects.toThrow('NEXT_NOT_FOUND');

		expect(notFoundMock).toHaveBeenCalledOnce();
	});

	it('@ 접두사가 없는 경로는 feature를 호출하지 않고 not-found 처리한다', async () => {
		await expect(
			BlogHomePage({ params: Promise.resolve({ slug: 'jetproc' }), searchParams: Promise.resolve({}) }),
		).rejects.toThrow('NEXT_NOT_FOUND');

		expect(prefetchBlogHomeInitialState).not.toHaveBeenCalled();
		expect(getBlogPublicProfile).not.toHaveBeenCalled();
		expect(notFoundMock).toHaveBeenCalledOnce();
	});

	it.each(['@abc', '@invalid.slug', `@${'a'.repeat(21)}`])(
		'유효하지 않은 slug 경로 %s는 프로필을 조회하지 않고 not-found 처리한다',
		async (slug) => {
			await expect(
				BlogHomePage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) }),
			).rejects.toThrow('NEXT_NOT_FOUND');

			expect(getBlogPublicProfile).not.toHaveBeenCalled();
			expect(prefetchBlogHomeInitialState).not.toHaveBeenCalled();
			expect(notFoundMock).toHaveBeenCalledOnce();
		},
	);

	it('메타데이터 생성도 유효하지 않은 slug를 조회하지 않고 not-found 처리한다', async () => {
		await expect(
			generateMetadata({ params: Promise.resolve({ slug: '@invalid.slug' }), searchParams: Promise.resolve({}) }),
		).rejects.toThrow('NEXT_NOT_FOUND');

		expect(getBlogPublicProfile).not.toHaveBeenCalled();
		expect(notFoundMock).toHaveBeenCalledOnce();
	});

	it('언더스코어가 포함된 slug는 유효한 블로그 경로로 조회한다', async () => {
		await renderPage('@rilog_user');

		expect(getBlogPublicProfile).toHaveBeenCalledWith('rilog_user');
	});

	it('하이픈이 포함된 기존 경로는 query를 보존한 canonical 경로로 redirect한다', async () => {
		await expect(
			BlogHomePage({
				params: Promise.resolve({ slug: '@rilog-fe' }),
				searchParams: Promise.resolve({ notice: ['one', 'two'] }),
			}),
		).rejects.toThrow('NEXT_REDIRECT');

		expect(permanentRedirectMock).toHaveBeenCalledWith('/@rilog_fe?notice=one&notice=two');
		expect(getBlogPublicProfile).not.toHaveBeenCalled();
	});

	it('하이픈이 포함된 기존 경로의 metadata 요청도 canonical 경로로 redirect한다', async () => {
		await expect(
			generateMetadata({
				params: Promise.resolve({ slug: '@rilog-fe' }),
				searchParams: Promise.resolve({ from: 'feed' }),
			}),
		).rejects.toThrow('NEXT_REDIRECT');

		expect(permanentRedirectMock).toHaveBeenCalledWith('/@rilog_fe?from=feed');
		expect(getBlogPublicProfile).not.toHaveBeenCalled();
	});
});
