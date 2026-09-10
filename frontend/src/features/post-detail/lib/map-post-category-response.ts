import type { PostCategory } from '@/domains/post/model/post';
import type { PostCategoryResponse } from '@/shared/api/posts/types';

const POST_CATEGORY_BY_RESPONSE_VALUE: Record<PostCategoryResponse, PostCategory> = {
	기술: 'TECH',
	일상: 'DAILY',
	회고: 'RETROSPECT',
};

export const mapPostCategoryResponse = (category: PostCategoryResponse): PostCategory =>
	POST_CATEGORY_BY_RESPONSE_VALUE[category];
