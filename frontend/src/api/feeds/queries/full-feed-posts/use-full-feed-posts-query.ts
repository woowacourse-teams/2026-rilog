'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { FullFeedPostResponse } from '@/api/feeds/feeds.types';
import type { ApiResponse } from '@/api/types';
import type { InfiniteData } from '@tanstack/react-query';

import { fullFeedPostsQueryOptions } from './full-feed-posts-query-options';

interface UseFullFeedPostsQueryOptions<TData> {
	size?: number;
	isEnabled?: boolean;
	select?: (data: InfiniteData<ApiResponse<FullFeedPostResponse>, unknown>) => TData;
}

export const useFullFeedPostsQuery = <TData = InfiniteData<ApiResponse<FullFeedPostResponse>, unknown>>({
	size,
	isEnabled = true,
	select,
}: UseFullFeedPostsQueryOptions<TData> = {}) =>
	useInfiniteQuery({
		...fullFeedPostsQueryOptions({ size }),
		enabled: isEnabled,
		select,
	});
