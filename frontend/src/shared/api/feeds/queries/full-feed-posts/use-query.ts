'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { FullFeedPostResponse } from '@/shared/api/feeds/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import type { InfiniteData } from '@tanstack/react-query';

import { fullFeedPostsQueryOptions } from './query-options';

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
