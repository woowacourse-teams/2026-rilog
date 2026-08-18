import type { FullFeedPostResponse, FullFeedPostsRequest } from './types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { apiClient } from '@/shared/api/api-client';

export const readFullFeedPosts = ({ page, size }: FullFeedPostsRequest) =>
	apiClient
		.get('v1/feeds/posts', {
			searchParams: { page, size },
		})
		.json<ApiResponse<FullFeedPostResponse>>();
