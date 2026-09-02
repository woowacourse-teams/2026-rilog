'use client';

import type { InfiniteData } from '@tanstack/react-query';

import type { PostFeedPage } from '@/domains/post/model/post';
import { usePublicBlogPostsQuery } from '@/shared/api/blogs/queries/public-blog-posts/use-query';
import type { PublicBlogFeedPostResponse, PublicBlogPostsFilter } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { mapPublicBlogPosts } from '../lib/map-public-blog-posts';

interface UsePublicBlogPostsOptions {
	slug: string;
	filter: PublicBlogPostsFilter;
	isEnabled?: boolean;
}

const selectPublicBlogPosts = (
	data: InfiniteData<ApiResponse<PublicBlogFeedPostResponse>, unknown>,
): InfiniteData<PostFeedPage, unknown> => ({
	...data,
	pages: data.pages.map((page) => mapPublicBlogPosts(page, page.data?.page ?? 0)),
});

export const usePublicBlogPosts = ({ slug, filter, isEnabled = true }: UsePublicBlogPostsOptions) =>
	usePublicBlogPostsQuery({ slug, filter, isEnabled, select: selectPublicBlogPosts });
