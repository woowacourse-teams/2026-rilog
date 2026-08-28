import { infiniteQueryOptions } from '@tanstack/react-query';

import type { PublicBlogFeedPostResponse } from '../../types';

import type { ApiResponse } from '@/shared/api/shared.types';

import { readPublicBlogPosts } from '../../api';
import { blogsQueryKeys } from '../keys';

export const PUBLIC_BLOG_POSTS_PAGE_SIZE = 12;

export interface PublicBlogPostsQueryOptions {
	slug: string;
	size?: number;
}

export const publicBlogPostsQueryOptions = ({
	slug,
	size = PUBLIC_BLOG_POSTS_PAGE_SIZE,
}: PublicBlogPostsQueryOptions) =>
	infiniteQueryOptions<ApiResponse<PublicBlogFeedPostResponse>>({
		queryKey: blogsQueryKeys.publicBlogPosts(slug),
		queryFn: ({ pageParam }) => readPublicBlogPosts({ slug, page: Number(pageParam), size }),
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const page = lastPage?.data?.page;
			return lastPage?.data?.hasNext === true && page !== undefined ? page + 1 : undefined;
		},
		staleTime: 60_000,
		retry: false,
	});
