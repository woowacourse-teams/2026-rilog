import type { BlogType } from '@/domains/blog/model/blog';
import type { PostCategory, PostCategoryLabel } from '@/domains/post/model/post';
import type { ChapterResponse } from '@/shared/api/blogs/types';

export interface FullFeedPostsFilters {
	category?: PostCategory;
	blogType?: BlogType;
}

export interface FullFeedPostsRequest extends FullFeedPostsFilters {
	page: number;
	size: number;
}

interface FullFeedAuthorResponse {
	userId: number;
	nickname: string;
	slug: string;
	profileImageUrl: string | null;
}

interface FullFeedOwnerResponse {
	type: BlogType;
	blogId: number;
	slug: string;
	name: string;
	profileImageUrl: string | null;
}

export interface PostItemResponse {
	postId: number;
	title: string;
	thumbnailImageUrl: string | null;
	category: PostCategoryLabel;
	visibility: string;
	publishedAt: string;
	author: FullFeedAuthorResponse;
	owner: FullFeedOwnerResponse;
	chapter?: ChapterResponse | null;
}

export interface FullFeedPostResponse {
	posts: PostItemResponse[];
	page: number;
	size: number;
	numberOfElements: number;
	hasNext: boolean;
}
