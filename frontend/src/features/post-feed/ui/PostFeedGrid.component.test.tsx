import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostFeedItem, PostFeedPage } from '@/domains/post/model/post-feed';
import { fetchMockPostFeedPage } from '@/features/post-feed/model/post-feed.mock';

import PostFeedGrid from './PostFeedGrid';

// TODO(API 연동): 실제 fetcher 모듈로 전환할 때 mock 대상도 함께 교체
vi.mock('@/features/post-feed/model/post-feed.mock', () => ({
	fetchMockPostFeedPage: vi.fn(),
	POST_FEED_PAGE_SIZE: 12,
}));

const fetchMockPostFeedPageMock = vi.mocked(fetchMockPostFeedPage);

const createPost = (id: number): PostFeedItem => ({
	id,
	title: `게시글 ${id}`,
	thumbnailUrl: null,
	publishedAt: '2026-08-14T09:00:00',
	author: { nickname: '작성자', profileImageUrl: null },
	colog: null,
});

const createPosts = (startId: number, count: number) =>
	Array.from({ length: count }, (_, index) => createPost(startId + index));

const createPage = (items: PostFeedItem[], page = 0, hasNext = false): PostFeedPage => ({ items, page, hasNext });

const createDeferred = <T,>() => {
	let resolve: (value: T) => void = () => undefined;
	const promise = new Promise<T>((resolver) => {
		resolve = resolver;
	});

	return { promise, resolve };
};

const renderGrid = (props: React.ComponentProps<typeof PostFeedGrid>) => {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

	return render(
		<QueryClientProvider client={queryClient}>
			<PostFeedGrid {...props} />
		</QueryClientProvider>,
	);
};

describe('PostFeedGrid', () => {
	let observerCallback: IntersectionObserverCallback;

	beforeEach(() => {
		fetchMockPostFeedPageMock.mockReset();
		class IntersectionObserverMock {
			observe = vi.fn();
			disconnect = vi.fn();
			unobserve = vi.fn();
			root = null;
			rootMargin = '';
			thresholds = [];
			takeRecords = () => [];

			constructor(callback: IntersectionObserverCallback) {
				observerCallback = callback;
			}
		}

		vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
	});

	it('빈 첫 페이지에는 mock 대신 빈 상태를 표시한다', () => {
		renderGrid({ initialPage: createPage([]) });

		expect(screen.getByText('아직 발행된 게시글이 없어요.')).toBeInTheDocument();
		expect(fetchMockPostFeedPageMock).not.toHaveBeenCalled();
	});

	it('초기 서버 요청 실패 후 첫 페이지를 다시 요청한다', async () => {
		const user = userEvent.setup();
		fetchMockPostFeedPageMock.mockResolvedValue(createPage([createPost(1)]));
		renderGrid({ initialRequestFailed: true });

		expect(screen.getByText('피드를 불러오지 못했어요.')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '다시 시도' }));

		expect(await screen.findByRole('link', { name: /게시글 1/ })).toBeInTheDocument();
		expect(fetchMockPostFeedPageMock).toHaveBeenCalledWith(0);
	});

	it('첫 12개를 표시하고 스크롤 진입마다 24개와 36개로 이어 붙인다', async () => {
		const firstNextPage = createDeferred<PostFeedPage>();
		const lastPage = createDeferred<PostFeedPage>();
		fetchMockPostFeedPageMock.mockReturnValueOnce(firstNextPage.promise).mockReturnValueOnce(lastPage.promise);
		renderGrid({ initialPage: createPage(createPosts(1, 12), 0, true) });

		expect(screen.getAllByRole('link')).toHaveLength(12);
		const firstObserverCallback = observerCallback;

		act(() => {
			firstObserverCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
		});
		expect(await screen.findByText('게시글을 더 불러오는 중...')).toBeInTheDocument();
		act(() => {
			firstNextPage.resolve(createPage(createPosts(13, 12), 1, true));
		});
		await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(24));
		await waitFor(() => expect(observerCallback).not.toBe(firstObserverCallback));

		act(() => {
			observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
		});
		expect(await screen.findByText('게시글을 더 불러오는 중...')).toBeInTheDocument();
		act(() => {
			lastPage.resolve(createPage(createPosts(25, 12), 2, false));
		});
		await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(36));

		expect(fetchMockPostFeedPageMock).toHaveBeenNthCalledWith(1, 1);
		expect(fetchMockPostFeedPageMock).toHaveBeenNthCalledWith(2, 2);
	});

	it('sentinel이 보이면 다음 페이지를 한 번 추가하고 중복 게시글을 제거한다', async () => {
		fetchMockPostFeedPageMock.mockResolvedValue(createPage([createPost(1), createPost(2)], 1));
		renderGrid({ initialPage: createPage([createPost(1)], 0, true) });

		act(() => {
			observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
			observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
		});

		expect(await screen.findByRole('link', { name: /게시글 2/ })).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: /게시글 1/ })).toHaveLength(1);
		expect(fetchMockPostFeedPageMock).toHaveBeenCalledTimes(1);
		expect(fetchMockPostFeedPageMock).toHaveBeenCalledWith(1);
	});

	it('다음 페이지 요청 실패 시 기존 글을 유지하고 실패한 페이지를 다시 요청한다', async () => {
		const user = userEvent.setup();
		fetchMockPostFeedPageMock
			.mockRejectedValueOnce(new Error('network error'))
			.mockResolvedValueOnce(createPage([createPost(2)], 1));
		renderGrid({ initialPage: createPage([createPost(1)], 0, true) });

		act(() => {
			observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
		});

		expect(await screen.findByText('다음 게시글을 불러오지 못했어요.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /게시글 1/ })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '다시 시도' }));

		expect(await screen.findByRole('link', { name: /게시글 2/ })).toBeInTheDocument();
		expect(fetchMockPostFeedPageMock).toHaveBeenNthCalledWith(1, 1);
		expect(fetchMockPostFeedPageMock).toHaveBeenNthCalledWith(2, 1);
	});
});
