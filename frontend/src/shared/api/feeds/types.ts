import type { BlogType } from '@/domains/blog/model/blog';

export interface FullFeedPostsRequest {
	page: number;
	size: number;
}

export interface AuthorResponse {
	userId: number;
	name?: string;
	nickname?: string;
	slug: string;
	profileImageUrl: string | null;
}

interface BaseOwnerResponse {
	type: BlogType;
	blogId: number;
	slug: string;
	name: string;
}

export interface RilogOwnerResponse extends BaseOwnerResponse {
	type: 'RILOG';
	profileImageUrl: string | null;
}

export interface CologOwnerResponse extends BaseOwnerResponse {
	type: 'COLOG';
	profileImageUrl: string | null;
	coverImageUrl: string | null;
	memberCount: number;
	postCount: number;
}

export type PostOwnerResponse = RilogOwnerResponse | CologOwnerResponse;

export interface PostItemResponse {
	postId: number;
	title: string;
	thumbnailImageUrl: string | null;
	category: string;
	visibility: string;
	publishedAt: string;
	author: AuthorResponse;
	owner: PostOwnerResponse;
}

export interface FullFeedPostResponse {
	posts: PostItemResponse[];
	page: number;
	size: number;
	numberOfElements: number;
	hasNext: boolean;
}
