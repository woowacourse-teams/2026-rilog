import { apiClient } from '@/shared/api/client';
import type {
	PostDetailRequest,
	PostDetailResponse,
	PostPublishRequest,
	PostPublishResponse,
	PostsCountResponse,
	PostUpdateRequest,
	PostUpdateResponse,
} from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const publishPost = (request: PostPublishRequest) => {
	const { slug, ...post } = request;
	const body: PostPublishRequest = {
		slug: stripAtPrefix(slug),
		...post,
	};

	return apiClient.post<ApiResponse<PostPublishResponse>>('v1/posts', { json: body });
};

export const readPostsCount = () => {
	return apiClient.get<ApiResponse<PostsCountResponse>>('v1/posts/count');
};

export const readPostDetail = ({ postId }: PostDetailRequest) =>
	apiClient.get<ApiResponse<PostDetailResponse>>(`v1/posts/${postId}`);

export const updatePost = (postId: number, request: PostUpdateRequest) => {
	const { slug, ...post } = request;
	const body: PostUpdateRequest = {
		slug: stripAtPrefix(slug),
		...post,
	};

	return apiClient.put<ApiResponse<PostUpdateResponse>>(`v1/posts/${postId}`, { json: body });
};
