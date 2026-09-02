'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { InfiniteData } from '@tanstack/react-query';

import type { PublicBlogFeedPostResponse } from '@/shared/api/blogs/types';
import type { PublicBlogPostsFilter } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { publicBlogPostsQueryOptions } from './query-options';

interface UsePublicBlogPostsQueryOptions<TData> {
	slug: string;
	filter: PublicBlogPostsFilter;
	isEnabled?: boolean;
	select?: (data: InfiniteData<ApiResponse<PublicBlogFeedPostResponse>, unknown>) => TData;
}

export const usePublicBlogPostsQuery = <TData = InfiniteData<ApiResponse<PublicBlogFeedPostResponse>, unknown>>({
	slug,
	filter,
	isEnabled = true,
	select,
}: UsePublicBlogPostsQueryOptions<TData>) =>
	useInfiniteQuery({
		...publicBlogPostsQueryOptions({ slug, filter }),
		enabled: isEnabled,
		select,
	});
