import { infiniteQueryOptions } from '@tanstack/react-query';

import type { FullFeedPostResponse } from '../../feeds.types';
import type { ApiResponse } from '@/api/types';

import { readFullFeedPosts } from '../../feeds.apis';
import { feedsKeys } from '../../feeds.keys';

export const FULL_FEED_POSTS_PAGE_SIZE = 12;

export interface FullFeedPostsQueryOptions {
	size?: number;
}

export const fullFeedPostsQueryOptions = ({ size = FULL_FEED_POSTS_PAGE_SIZE }: FullFeedPostsQueryOptions = {}) =>
	infiniteQueryOptions<ApiResponse<FullFeedPostResponse>>({
		queryKey: feedsKeys.fullPosts(size),
		queryFn: ({ pageParam }) => readFullFeedPosts({ page: Number(pageParam), size }),
		initialPageParam: 0,
		getNextPageParam: (lastPage) =>
			lastPage.data?.hasNext === true && lastPage.data.page !== undefined ? lastPage.data.page + 1 : undefined,
		staleTime: 60_000,
		retry: false,
	});
