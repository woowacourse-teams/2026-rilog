'use client';

import type { InfiniteData } from '@tanstack/react-query';

import type { PostFeedPage } from '@/domains/post/model/post';
import { usePublicBlogPostsQuery } from '@/shared/api/blogs/queries/public-blog-posts/use-query';
import type { PublicBlogFeedPostResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { mapPublicBlogPosts } from '../lib/map-public-blog-posts';

interface UsePublicBlogPostsOptions {
	slug: string;
	isEnabled?: boolean;
}

const selectPublicBlogPosts = (
	data: InfiniteData<ApiResponse<PublicBlogFeedPostResponse>, unknown>,
): InfiniteData<PostFeedPage, unknown> => ({
	...data,
	pages: data.pages.map((page) => mapPublicBlogPosts(page, page.data?.page ?? 0)),
});

export const usePublicBlogPosts = ({ slug, isEnabled = true }: UsePublicBlogPostsOptions) =>
	usePublicBlogPostsQuery({ slug, isEnabled, select: selectPublicBlogPosts });
