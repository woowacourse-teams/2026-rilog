import type { FullFeedPostResponse, FullFeedPostsRequest } from './feeds.types';
import type { ApiResponse } from '@/api/types';

import { apiClient } from '@/shared/api/api-client';

export const readFullFeedPosts = ({ page, size }: FullFeedPostsRequest) =>
	apiClient
		.get('v1/feeds/posts', {
			searchParams: { page, size },
		})
		.json<ApiResponse<FullFeedPostResponse>>();
