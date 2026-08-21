import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostFeedItem, PostFeedPage } from '@/domains/post/model/post';
import { readFullFeedPosts } from '@/shared/api/feeds/api';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import type { FullFeedPostResponse, PostItemResponse } from '@/shared/api/feeds/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import PostFeedGrid from './PostFeedGrid';

vi.mock('@/shared/api/feeds/api', () => ({
	readFullFeedPosts: vi.fn(),
}));

const readFullFeedPostsMock = vi.mocked(readFullFeedPosts);

const createPost = (id: number): PostFeedItem => ({
	id,
	title: `게시글 ${id}`,
	thumbnailUrl: null,
	publishedAt: '2026-08-14T09:00:00',
	author: { id: 1, nickname: '작성자', slug: 'author', profileImageUrl: null },
	blog: { id, name: '작성자', slug: 'author', type: 'RILOG', profileImageUrl: null },
});

const createPosts = (startId: number, count: number) =>
	Array.from({ length: count }, (_, index) => createPost(startId + index));

const createPage = (items: PostFeedItem[], page = 0, hasNext = false): PostFeedPage => ({ items, page, hasNext });

const toApiPost = (post: PostFeedItem): PostItemResponse => ({
	postId: post.id,
	title: post.title,
	thumbnailImageUrl: post.thumbnailUrl ?? null,
	category: 'TECH',
	visibility: 'PUBLIC',
	publishedAt: post.publishedAt,
	author: {
		userId: post.author.id,
		name: post.author.nickname,
		nickname: post.author.nickname,
		slug: post.author.slug,
		profileImageUrl: post.author.profileImageUrl,
	},
	owner: post.blog
		? {
				type: 'COLOG',
				blogId: post.blog.id,
				name: post.blog.name,
				slug: post.blog.slug,
				profileImageUrl: post.blog.profileImageUrl ?? null,
				coverImageUrl: null,
				memberCount: 1,
				postCount: 1,
			}
		: {
				type: 'RILOG',
				blogId: post.id,
				name: '개인 블로그',
				slug: `blog-${post.id}`,
				profileImageUrl: null,
			},
});

const toApiResponse = (page: PostFeedPage): ApiResponse<FullFeedPostResponse> => ({
	status: 200,
	message: 'OK',
	data: {
		posts: page.items.map(toApiPost),
		page: page.page,
		size: 12,
		numberOfElements: page.items.length,
		hasNext: page.hasNext,
	},
});

const createDeferred = <T,>() => {
	let resolve: (value: T) => void = () => undefined;
	const promise = new Promise<T>((resolver) => {
		resolve = resolver;
	});

	return { promise, resolve };
};

interface RenderGridProps extends React.ComponentProps<typeof PostFeedGrid> {
	initialPage?: PostFeedPage;
}

const renderGrid = ({ initialPage, ...props }: RenderGridProps = {}) => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

	if (initialPage !== undefined) {
		queryClient.setQueryData(feedsQueryKeys.fullFeedPosts(12), {
			pages: [toApiResponse(initialPage)],
			pageParams: [initialPage.page],
		});
	}

	return render(
		<QueryClientProvider client={queryClient}>
			<PostFeedGrid {...props} />
		</QueryClientProvider>,
	);
};

describe('PostFeedGrid', () => {
	let observerCallback: IntersectionObserverCallback;

	beforeEach(() => {
		readFullFeedPostsMock.mockReset();
		class IntersectionObserverMock {
			observe = vi.fn();
			disconnect = vi.fn();
			unobserve = vi.fn();
			root = null;
			rootMargin = '';
			thresholds = [];

			constructor(callback: IntersectionObserverCallback) {
				observerCallback = callback;
			}

			takeRecords = () => [];
		}

		vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
	});

	it('빈 첫 페이지에는 빈 상태를 표시한다', () => {
		renderGrid({ initialPage: createPage([]) });

		expect(screen.getByText('아직 발행된 게시글이 없어요.')).toBeInTheDocument();
		expect(readFullFeedPostsMock).not.toHaveBeenCalled();
	});

	it('초기 서버 요청 실패 후 첫 페이지를 다시 요청한다', async () => {
		const user = userEvent.setup();
		readFullFeedPostsMock.mockResolvedValue(toApiResponse(createPage([createPost(1)])));
		renderGrid({ initialRequestFailed: true });

		expect(screen.getByText('피드를 불러오지 못했어요.')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '다시 시도' }));

		expect(await screen.findByRole('link', { name: /게시글 1/ })).toBeInTheDocument();
		expect(readFullFeedPostsMock).toHaveBeenCalledWith({ page: 0, size: 12 });
	});

	it('첫 12개를 표시하고 스크롤 진입마다 24개와 36개로 이어 붙인다', async () => {
		const firstNextPage = createDeferred<ApiResponse<FullFeedPostResponse>>();
		const lastPage = createDeferred<ApiResponse<FullFeedPostResponse>>();
		readFullFeedPostsMock.mockReturnValueOnce(firstNextPage.promise).mockReturnValueOnce(lastPage.promise);
		renderGrid({ initialPage: createPage(createPosts(1, 12), 0, true) });

		expect(screen.getAllByRole('link')).toHaveLength(12);
		const firstObserverCallback = observerCallback;

		act(() => {
			firstObserverCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
		});
		expect(await screen.findByText('게시글을 더 불러오는 중...')).toBeInTheDocument();
		act(() => {
			firstNextPage.resolve(toApiResponse(createPage(createPosts(13, 12), 1, true)));
		});
		await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(24));
		await waitFor(() => expect(observerCallback).not.toBe(firstObserverCallback));

		act(() => {
			observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
		});
		expect(await screen.findByText('게시글을 더 불러오는 중...')).toBeInTheDocument();
		act(() => {
			lastPage.resolve(toApiResponse(createPage(createPosts(25, 12), 2, false)));
		});
		await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(36));

		expect(readFullFeedPostsMock).toHaveBeenNthCalledWith(1, { page: 1, size: 12 });
		expect(readFullFeedPostsMock).toHaveBeenNthCalledWith(2, { page: 2, size: 12 });
	});

	it('sentinel이 보이면 다음 페이지를 한 번 추가하고 중복 게시글을 제거한다', async () => {
		readFullFeedPostsMock.mockResolvedValue(toApiResponse(createPage([createPost(1), createPost(2)], 1)));
		renderGrid({ initialPage: createPage([createPost(1)], 0, true) });

		act(() => {
			observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
			observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
		});

		expect(await screen.findByRole('link', { name: /게시글 2/ })).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: /게시글 1/ })).toHaveLength(1);
		expect(readFullFeedPostsMock).toHaveBeenCalledTimes(1);
		expect(readFullFeedPostsMock).toHaveBeenCalledWith({ page: 1, size: 12 });
	});

	it('다음 페이지 요청 실패 시 기존 글을 유지하고 실패한 페이지를 다시 요청한다', async () => {
		const user = userEvent.setup();
		readFullFeedPostsMock
			.mockRejectedValueOnce(new Error('network error'))
			.mockResolvedValueOnce(toApiResponse(createPage([createPost(2)], 1)));
		renderGrid({ initialPage: createPage([createPost(1)], 0, true) });

		act(() => {
			observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
		});

		expect(await screen.findByText('다음 게시글을 불러오지 못했어요.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /게시글 1/ })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '다시 시도' }));

		expect(await screen.findByRole('link', { name: /게시글 2/ })).toBeInTheDocument();
		expect(readFullFeedPostsMock).toHaveBeenNthCalledWith(1, { page: 1, size: 12 });
		expect(readFullFeedPostsMock).toHaveBeenNthCalledWith(2, { page: 1, size: 12 });
	});
});
