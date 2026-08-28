import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';

import BlogHomePage from './page';

const { notFoundMock, readBlogPublicProfileMock } = vi.hoisted(() => ({
	notFoundMock: vi.fn((): never => {
		throw new Error('NEXT_NOT_FOUND');
	}),
	readBlogPublicProfileMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));

vi.mock('@/shared/api/blogs/api', () => ({ readBlogPublicProfile: readBlogPublicProfileMock }));

vi.mock('@/widgets/blog-home/ui/BlogHome', () => ({
	default: function MockBlogHome({ profile }: { profile: BlogPublicProfile }) {
		return <div>{`${profile.type}:${profile.slug}`}</div>;
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

describe('BlogHomePage', () => {
	beforeEach(() => {
		notFoundMock.mockClear();
		readBlogPublicProfileMock.mockReset();
	});

	it('정규화한 slug로 공개 프로필을 한 번 조회하고 공통 홈에 전달한다', async () => {
		readBlogPublicProfileMock.mockResolvedValue({ status: 200, message: 'OK', data: RILOG_RESPONSE });

		render(await BlogHomePage({ params: Promise.resolve({ slug: '@jetproc' }) }));

		expect(readBlogPublicProfileMock).toHaveBeenCalledOnce();
		expect(readBlogPublicProfileMock).toHaveBeenCalledWith({ slug: 'jetproc' });
		expect(screen.getByText('RILOG:jetproc')).toBeInTheDocument();
	});

	it('공개 프로필 data가 없으면 not-found 처리한다', async () => {
		readBlogPublicProfileMock.mockResolvedValue({ status: 200, message: 'OK' });

		await expect(BlogHomePage({ params: Promise.resolve({ slug: '@missing' }) })).rejects.toThrow('NEXT_NOT_FOUND');
		expect(notFoundMock).toHaveBeenCalledOnce();
	});

	it('지원하지 않는 공개 프로필 type이면 not-found 처리한다', async () => {
		readBlogPublicProfileMock.mockResolvedValue({
			status: 200,
			message: 'OK',
			data: { ...RILOG_RESPONSE, type: 'UNKNOWN' },
		});

		await expect(BlogHomePage({ params: Promise.resolve({ slug: '@jetproc' }) })).rejects.toThrow('NEXT_NOT_FOUND');
		expect(notFoundMock).toHaveBeenCalledOnce();
	});

	it('@ 접두사가 없는 경로에서는 프로필을 조회하지 않고 not-found 처리한다', async () => {
		await expect(BlogHomePage({ params: Promise.resolve({ slug: 'jetproc' }) })).rejects.toThrow('NEXT_NOT_FOUND');

		expect(readBlogPublicProfileMock).not.toHaveBeenCalled();
		expect(notFoundMock).toHaveBeenCalledOnce();
	});
});
