import { POST_CATEGORY_OPTIONS, type PostCategory } from '@/domains/post/model/post';
import type { PostCategoryResponse } from '@/shared/api/posts/types';

export const mapPostCategoryResponse = (category: PostCategoryResponse): PostCategory => {
	const categoryOption = POST_CATEGORY_OPTIONS.find(({ label }) => label === category);
	if (categoryOption === undefined) {
		throw new Error(`지원하지 않는 게시글 카테고리입니다: ${category}`);
	}

	return categoryOption.value;
};
