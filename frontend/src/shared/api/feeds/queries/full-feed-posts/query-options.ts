import { infiniteQueryOptions } from '@tanstack/react-query';

import type { FullFeedPostResponse, FullFeedPostsFilters } from '../../types';

import type { ApiResponse } from '@/shared/api/shared.types';

import { readFullFeedPosts } from '../../api';
import { feedsQueryKeys } from '../keys';

export const FULL_FEED_POSTS_PAGE_SIZE = 12;

export interface FullFeedPostsQueryOptions extends FullFeedPostsFilters {
	size?: number;
}

export const fullFeedPostsQueryOptions = ({
	size = FULL_FEED_POSTS_PAGE_SIZE,
	category,
	blogType,
}: FullFeedPostsQueryOptions = {}) =>
	infiniteQueryOptions<ApiResponse<FullFeedPostResponse>>({
		queryKey: feedsQueryKeys.fullFeedPosts({ size, category, blogType }),
		queryFn: ({ pageParam }) => readFullFeedPosts({ page: Number(pageParam), size, category, blogType }),
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const page = lastPage?.data?.page;
			return lastPage?.data?.hasNext === true && page !== undefined ? page + 1 : undefined;
		},
		staleTime: 60_000,
		retry: false,
	});
