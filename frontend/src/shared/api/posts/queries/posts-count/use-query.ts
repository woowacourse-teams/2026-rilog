'use client';

import { useQuery } from '@tanstack/react-query';

import type { PostsCountResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { postsCountQueryOptions } from './query-options';

interface UsePostsCountQueryOptions<TData> {
	isEnabled?: boolean;
	select?: (data: ApiResponse<PostsCountResponse>) => TData;
}

export const usePostsCountQuery = <TData = ApiResponse<PostsCountResponse>>({
	isEnabled = true,
	select,
}: UsePostsCountQueryOptions<TData> = {}) => {
	return useQuery({
		...postsCountQueryOptions(),
		enabled: isEnabled,
		select,
	});
};
