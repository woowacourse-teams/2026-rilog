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
	default: function MockPostDetail({ initialSelectionId }: { initialSelectionId: number | null }) {
		return (
			<div>
				게시글 상세
				<output aria-label="초기 selection ID">{initialSelectionId ?? '없음'}</output>
			</div>
		);
	},
}));

const POST_DETAIL: PostDetail = {
	id: 72,
	title: '게시글 제목',
	content: [],
	publishedAt: '2026-09-01T00:00:00+09:00',
	thumbnailUrl: null,
	category: 'TECH',
	chapter: { id: 3, name: '프론트엔드', order: 1 },
	viewerPermissions: { canEdit: true, canDelete: true },
	author: {
		id: 1,
		nickname: '파라디',
		slug: 'jetproc',
		profileImageUrl: null,
		description: '기록하며 성장하는 개발자입니다.',
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

	it('rewrite된 canonical 상세 경로는 다시 redirect하지 않는다', async () => {
		const page = await PostDetailPage({
			params: Promise.resolve({ slug: 'jetproc', postId: '72' }),
			searchParams: Promise.resolve({}),
		});

		render(page);

		expect(screen.getByText('게시글 상세')).toBeInTheDocument();
		expect(permanentRedirectMock).not.toHaveBeenCalled();
	});

	it('유효한 selection ID를 댓글 화면으로 전달하고 잘못된 ID는 무시한다', async () => {
		const params = Promise.resolve({ slug: 'jetproc', postId: '72' });
		render(await PostDetailPage({ params, searchParams: Promise.resolve({ selectionId: '27' }) }));
		expect(screen.getByRole('status', { name: '초기 selection ID' })).toHaveTextContent('27');

		render(await PostDetailPage({ params, searchParams: Promise.resolve({ selectionId: ['27', '28'] }) }));
		expect(screen.getAllByRole('status', { name: '초기 selection ID' })[1]).toHaveTextContent('없음');
	});

	it('게시글 소유자와 다른 slug는 canonical 상세 경로로 redirect한다', async () => {
		await expect(
			PostDetailPage({
				params: Promise.resolve({ slug: 'wrong_slug', postId: '72' }),
				searchParams: Promise.resolve({ selectionId: '27' }),
			}),
		).rejects.toThrow('NEXT_REDIRECT');

		expect(permanentRedirectMock).toHaveBeenCalledWith('/@jetproc/posts/72?selectionId=27');
	});

	it('하이픈이 포함된 기존 상세 경로는 query를 보존한 canonical 경로로 redirect한다', async () => {
		await expect(
			PostDetailPage({
				params: Promise.resolve({ slug: 'rilog-fe', postId: '72' }),
				searchParams: Promise.resolve({ from: 'feed' }),
			}),
		).rejects.toThrow('NEXT_REDIRECT');

		expect(permanentRedirectMock).toHaveBeenCalledWith('/@rilog_fe/posts/72?from=feed');
		expect(getPublicPostDetail).not.toHaveBeenCalled();
	});
});
