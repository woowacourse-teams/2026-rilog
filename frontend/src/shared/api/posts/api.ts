import { apiClient } from '@/shared/api/client';
import type {
	PostDetailRequest,
	PostDetailResponse,
	PostsCountResponse,
	PostWriteRequest,
	PostWriteResponse,
} from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const publishPost = (request: PostWriteRequest) => {
	const { slug, ...post } = request;
	const body: PostWriteRequest = {
		slug: stripAtPrefix(slug),
		...post,
	};

	return apiClient.post<ApiResponse<PostWriteResponse>>('v1/posts', { json: body });
};

export const readPostsCount = () => {
	return apiClient.get<ApiResponse<PostsCountResponse>>('v1/posts/count');
};

// NOTE: 게시글 상세 조회 - posts 쪽에 있는 게 자연스럽다고 판단되어 일단 유지
export const readPostDetail = ({ slug, postId }: PostDetailRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<PostDetailResponse>>(`v1/blogs/${normalizedSlug}/posts/${postId}`);
};

export const updatePost = (postId: number, request: PostWriteRequest) => {
	const { slug, ...post } = request;
	const body: PostWriteRequest = {
		slug: stripAtPrefix(slug),
		...post,
	};

	return apiClient.put<ApiResponse<PostWriteResponse>>(`v1/posts/${postId}`, { json: body });
};

export const deletePost = (postId: number) => apiClient.delete(`v1/posts/${postId}`);
