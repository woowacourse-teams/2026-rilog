import type { PostsCountResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

export const mapPostsCountResponse = (response: ApiResponse<PostsCountResponse>) => {
	if (response.data === undefined) {
		return { totalPostsCount: 0 };
	}

	return {
		totalPostsCount: response.data.totalPostsCount,
	};
};
