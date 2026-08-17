'use client';

import type { FullFeedPostResponse } from '@/api/feeds/feeds.types';
import type { ApiResponse } from '@/api/types';
import type { InfiniteData } from '@tanstack/react-query';

import type { PostFeedPage } from '@/domains/post/model/post-feed';

import { useFullFeedPostsQuery } from '@/api/feeds/queries/full-feed-posts/use-full-feed-posts-query';

import { mapFullFeedPostResponse } from '../lib/map-full-feed-post-response';

interface UsePostFeedOptions {
	isEnabled: boolean;
}

const selectPostFeed = (
	data: InfiniteData<ApiResponse<FullFeedPostResponse>, unknown>,
): InfiniteData<PostFeedPage, unknown> => ({
	...data,
	pages: data.pages.map((page) => mapFullFeedPostResponse(page, page.data?.page ?? 0)),
});

export const usePostFeed = ({ isEnabled }: UsePostFeedOptions) =>
	useFullFeedPostsQuery({ isEnabled, select: selectPostFeed });
