import { apiClient } from '@/shared/api/api-client';
import type { BlogDetailRequest, PostDetailResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const readBlogPostDetail = ({ slug, postId }: BlogDetailRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient
		.get(`v1/blogs/${encodeURIComponent(normalizedSlug)}/posts/${postId}`)
		.json<ApiResponse<PostDetailResponse>>();
};
