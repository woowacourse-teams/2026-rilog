'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { InfiniteData } from '@tanstack/react-query';

import type { PublicBlogFeedPostResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { publicBlogPostsQueryOptions } from './query-options';

interface UsePublicBlogPostsQueryOptions<TData> {
	slug: string;
	size?: number;
	isEnabled?: boolean;
	select?: (data: InfiniteData<ApiResponse<PublicBlogFeedPostResponse>, unknown>) => TData;
}

export const usePublicBlogPostsQuery = <TData = InfiniteData<ApiResponse<PublicBlogFeedPostResponse>, unknown>>({
	slug,
	size,
	isEnabled = true,
	select,
}: UsePublicBlogPostsQueryOptions<TData>) =>
	useInfiniteQuery({
		...publicBlogPostsQueryOptions({ slug, size }),
		enabled: isEnabled,
		select,
	});
