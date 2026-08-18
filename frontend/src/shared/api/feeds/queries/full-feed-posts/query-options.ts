import { infiniteQueryOptions } from '@tanstack/react-query';

import type { FullFeedPostResponse } from '../../types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { readFullFeedPosts } from '../../api';
import { feedsQueryKeys } from '../keys';

export const FULL_FEED_POSTS_PAGE_SIZE = 12;

export interface FullFeedPostsQueryOptions {
	size?: number;
}

export const fullFeedPostsQueryOptions = ({ size = FULL_FEED_POSTS_PAGE_SIZE }: FullFeedPostsQueryOptions = {}) =>
	infiniteQueryOptions<ApiResponse<FullFeedPostResponse>>({
		queryKey: feedsQueryKeys.fullFeedPosts(size),
		queryFn: ({ pageParam }) => readFullFeedPosts({ page: Number(pageParam), size }),
		initialPageParam: 0,
		getNextPageParam: (lastPage) =>
			lastPage.data?.hasNext === true && lastPage.data.page !== undefined ? lastPage.data.page + 1 : undefined,
		staleTime: 60_000,
		retry: false,
	});
