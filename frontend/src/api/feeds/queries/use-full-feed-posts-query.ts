'use client';

import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';

import { readFullFeedPosts } from '../feeds.apis';
import { feedsKeys } from '../feeds.keys';

interface FullFeedPostsInfiniteQueryOptions {
	size: number;
}

interface UseFullFeedPostsQueryOptions extends FullFeedPostsInfiniteQueryOptions {
	isEnabled?: boolean;
}

export const fullFeedPostsInfiniteQueryOptions = ({ size }: FullFeedPostsInfiniteQueryOptions) =>
	infiniteQueryOptions({
		queryKey: feedsKeys.fullPosts(size),
		queryFn: ({ pageParam }) => readFullFeedPosts({ page: pageParam, size }),
		initialPageParam: 0,
		getNextPageParam: (lastPage) =>
			lastPage.data?.hasNext === true && lastPage.data.page !== undefined ? lastPage.data.page + 1 : undefined,
	});

export const useFullFeedPostsQuery = ({ size, isEnabled = true }: UseFullFeedPostsQueryOptions) =>
	useInfiniteQuery({
		...fullFeedPostsInfiniteQueryOptions({ size }),
		enabled: isEnabled,
	});
