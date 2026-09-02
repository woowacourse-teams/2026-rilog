import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostDetail } from '@/domains/post/model/post';
import { getPublicPostDetail } from '@/features/post-detail/lib/get-public-post-detail';

import PostDetailPage from './page';

const { notFoundMock, permanentRedirectMock } = vi.hoisted(() => ({
	notFoundMock: vi.fn((): never => {
		throw new Error('NEXT_NOT_FOUND');
	}),
	permanentRedirectMock: vi.fn((): never => {
		throw new Error('NEXT_REDIRECT');
	}),
}));

vi.mock('next/navigation', () => ({
	notFound: notFoundMock,
	permanentRedirect: permanentRedirectMock,
}));
vi.mock('@/features/post-detail/lib/get-public-post-detail');
vi.mock('@/widgets/post-detail/PostDetail', () => ({
	default: function MockPostDetail() {
		return <div>게시글 상세</div>;
	},
}));

const POST_DETAIL: PostDetail = {
	id: 72,
	title: '게시글 제목',
	content: [],
	publishedAt: '2026-09-01T00:00:00+09:00',
	thumbnailUrl: null,
	category: 'IT',
	viewerPermissions: { canEdit: true, canDelete: true },
	author: {
		id: 1,
		nickname: '파라디',
		slug: 'jetproc',
		profileImageUrl: null,
	},
	blog: {
		id: 1,
		type: 'RILOG',
		name: '파라디',
		slug: 'jetproc',
		profileImageUrl: null,
		owner: {
			id: 1,
			nickname: '파라디',
			slug: 'jetproc',
			profileImageUrl: null,
		},
	},
};

describe('PostDetailPage', () => {
	beforeEach(() => {
		notFoundMock.mockClear();
		permanentRedirectMock.mockClear();
		vi.mocked(getPublicPostDetail).mockReset();
		vi.mocked(getPublicPostDetail).mockResolvedValue(POST_DETAIL);
	});

	it('인코딩된 @ 접두사의 canonical 상세 경로는 다시 redirect하지 않는다', async () => {
		const page = await PostDetailPage({
			params: Promise.resolve({ slug: '%40jetproc', postId: '72' }),
		});

		render(page);

		expect(screen.getByText('게시글 상세')).toBeInTheDocument();
		expect(permanentRedirectMock).not.toHaveBeenCalled();
	});

	it('게시글 소유자와 다른 slug는 canonical 상세 경로로 redirect한다', async () => {
		await expect(PostDetailPage({ params: Promise.resolve({ slug: '@wrong-slug', postId: '72' }) })).rejects.toThrow(
			'NEXT_REDIRECT',
		);

		expect(permanentRedirectMock).toHaveBeenCalledWith('/@jetproc/posts/72');
	});
});
