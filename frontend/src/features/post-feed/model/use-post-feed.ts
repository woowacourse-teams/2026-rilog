'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { PostFeedPage } from '@/domains/post/model/post-feed';

// TODO(API 연동): 실제 피드 API 모듈의 fetcher와 page size로 교체
import { fetchMockPostFeedPage, POST_FEED_PAGE_SIZE } from './post-feed.mock';

interface UsePostFeedOptions {
	initialPage?: PostFeedPage;
	isEnabled: boolean;
}

export const POST_FEED_QUERY_KEY = ['posts', 'feed', { pageSize: POST_FEED_PAGE_SIZE }] as const;

export const usePostFeed = ({ initialPage, isEnabled }: UsePostFeedOptions) =>
	//무한스크롤내장훅
	useInfiniteQuery({
		queryKey: POST_FEED_QUERY_KEY,
		// TODO(API 연동): 전체 피드 조회 API에 pageParam을 전달하도록 교체한
		queryFn: ({ pageParam }) => fetchMockPostFeedPage(pageParam),
		initialPageParam: 0,
		getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
		initialData:
			initialPage === undefined
				? undefined
				: {
						pages: [initialPage],
						pageParams: [initialPage.page],
					},
		staleTime: 60_000,
		enabled: isEnabled,
		retry: false,
	});
