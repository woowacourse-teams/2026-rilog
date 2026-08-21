import type {
	BlogDetailRequest,
	CologPublicProfileResponse,
	PostDetailResponse,
	PostPublishResponse,
	PublishPostRequest,
	PublicBlogFeedPostResponse,
	PublicBlogFeedPostsRequest,
} from '@/shared/api/blogs/types';
import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const publishPost = ({ slug, request }: PublishPostRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.post<ApiResponse<PostPublishResponse>>(`v1/blogs/${encodeURIComponent(normalizedSlug)}/posts`, {
		json: request,
	});
};

export const readBlogPostDetail = ({ slug, postId }: BlogDetailRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<PostDetailResponse>>(
		`v1/blogs/${encodeURIComponent(normalizedSlug)}/posts/${postId}`,
	);
};

export const readBlogPublicProfile = ({ slug }: { slug: string }): Promise<ApiResponse<CologPublicProfileResponse>> => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<CologPublicProfileResponse>>(`v1/blogs/@${encodeURIComponent(normalizedSlug)}`);
};

export const readPublicBlogPosts = ({ slug, page, size }: PublicBlogFeedPostsRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<PublicBlogFeedPostResponse>>(
		`v1/blogs/@${encodeURIComponent(normalizedSlug)}/posts`,
		{
			searchParams: {
				page,
				size,
			},
		},
	);
};
