import type { FullFeedPostResponse, FullFeedPostsRequest } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';

export const readFullFeedPosts = ({ page, size, category, blogType }: FullFeedPostsRequest) =>
	apiClient.get<ApiResponse<FullFeedPostResponse>>('v1/feeds/posts', {
		searchParams: {
			page,
			size,
			...(category === undefined ? {} : { category }),
			...(blogType === undefined ? {} : { blogType }),
		},
	});
