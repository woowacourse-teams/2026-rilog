import type {
	BlogProfileUpdateRequest,
	BlogPublicProfileResponse,
	PublicBlogFeedPostResponse,
	PublicBlogFeedPostsRequest,
} from '@/shared/api/blogs/types';
import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const updateBlogProfile = (slug: string, request: BlogProfileUpdateRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.patch<ApiResponse<void>>(`v1/blogs/${encodeURIComponent(normalizedSlug)}/profiles`, {
		json: request,
	});
};

export const readBlogPublicProfile = ({ slug }: { slug: string }): Promise<ApiResponse<BlogPublicProfileResponse>> => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<BlogPublicProfileResponse>>(`v1/blogs/${encodeURIComponent(normalizedSlug)}`);
};

export const readPublicBlogPosts = ({ slug, page, size }: PublicBlogFeedPostsRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<PublicBlogFeedPostResponse>>(
		`v1/blogs/${encodeURIComponent(normalizedSlug)}/posts`,
		{
			searchParams: {
				page,
				size,
			},
		},
	);
};
