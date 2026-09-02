import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlogHomeInitialState } from '@/features/blog-home-index/server/prefetch-blog-home-initial-state';
import { prefetchBlogHomeInitialState } from '@/features/blog-home-index/server/prefetch-blog-home-initial-state';
import { getBlogPublicProfile } from '@/features/blog-profile/lib/get-blog-public-profile';

import BlogHomePage from './page';

const { notFoundMock } = vi.hoisted(() => ({
	notFoundMock: vi.fn((): never => {
		throw new Error('NEXT_NOT_FOUND');
	}),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
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
	return render(<QueryClientProvider client={new QueryClient()}>{page}</QueryClientProvider>);
};

describe('BlogHomePage', () => {
	beforeEach(() => {
		notFoundMock.mockClear();
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
});
