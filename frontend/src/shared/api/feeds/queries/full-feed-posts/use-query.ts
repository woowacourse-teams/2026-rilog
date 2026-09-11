'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { InfiniteData } from '@tanstack/react-query';

import type { FullFeedPostResponse, FullFeedPostsFilters } from '@/shared/api/feeds/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { fullFeedPostsQueryOptions } from './query-options';

interface UseFullFeedPostsQueryOptions<TData> extends FullFeedPostsFilters {
	size?: number;
	isEnabled?: boolean;
	select?: (data: InfiniteData<ApiResponse<FullFeedPostResponse>, unknown>) => TData;
}

export const useFullFeedPostsQuery = <TData = InfiniteData<ApiResponse<FullFeedPostResponse>, unknown>>({
	size,
	category,
	blogType,
	isEnabled = true,
	select,
}: UseFullFeedPostsQueryOptions<TData> = {}) =>
	useInfiniteQuery({
		...fullFeedPostsQueryOptions({ size, category, blogType }),
		enabled: isEnabled,
		select,
	});
