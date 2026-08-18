'use client';

import type { InfiniteData } from '@tanstack/react-query';

import type { PostFeedPage } from '@/domains/post/model/post-feed';
import { useFullFeedPostsQuery } from '@/shared/api/feeds/queries/full-feed-posts/use-query';
import type { FullFeedPostResponse } from '@/shared/api/feeds/types';
import type { ApiResponse } from '@/shared/api/shared.types';

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
