import type { FullFeedPostResponse, FullFeedPostsRequest } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';

export const readFullFeedPosts = ({ page, size, category, blogType, order }: FullFeedPostsRequest) =>
	apiClient.get<ApiResponse<FullFeedPostResponse>>(
		order === 'trending' ? 'v1/feeds/trending/posts' : 'v1/feeds/posts',
		{
			searchParams: {
				page,
				size,
				...(category === undefined ? {} : { category }),
				...(blogType === undefined ? {} : { blogType }),
			},
		},
	);
