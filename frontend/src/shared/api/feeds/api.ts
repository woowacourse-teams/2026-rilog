import type { FullFeedPostResponse, FullFeedPostsRequest } from './types';

import { apiClient } from '@/shared/api/api-client';
import type { ApiResponse } from '@/shared/api/shared.types';

export const readFullFeedPosts = ({ page, size }: FullFeedPostsRequest) =>
	apiClient
		.get('v1/feeds/posts', {
			searchParams: { page, size },
		})
		.json<ApiResponse<FullFeedPostResponse>>();
