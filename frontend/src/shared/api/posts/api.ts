import { apiClient } from '@/shared/api/client';
import type { PostDetailRequest, PostDetailResponse, PostsCountResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

export const readPostsCount = () => {
	return apiClient.get<ApiResponse<PostsCountResponse>>('v1/posts/count');
};

export const readPostDetail = ({ postId }: PostDetailRequest) =>
	apiClient.get<ApiResponse<PostDetailResponse>>(`v1/posts/${postId}`);
