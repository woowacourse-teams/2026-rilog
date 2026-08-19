import type {
	BlogDetailRequest,
	BlogPublicProfileRequest,
	CologPublicProfileResponse,
	PostDetailResponse,
} from '@/shared/api/blogs/types';
import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const readBlogPostDetail = ({ slug, postId }: BlogDetailRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<PostDetailResponse>>(
		`v1/blogs/${encodeURIComponent(normalizedSlug)}/posts/${postId}`,
	);
};

export const readBlogPublicProfile = ({ slug }: BlogPublicProfileRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<CologPublicProfileResponse>>(`v1/blogs/@${encodeURIComponent(normalizedSlug)}`);
};
