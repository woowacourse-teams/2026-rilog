import type { Block } from '@blocknote/core';

export type PostPublishCategory = 'TECH' | 'DAILY';
export type PostVisibility = 'PUBLIC' | 'PRIVATE';

export interface PostPublishRequest {
	title: string;
	content: Block[];
	category: PostPublishCategory;
	visibility: PostVisibility;
	thumbnailImageUrl: string | null;
	profileImageUrl: string | null;
}

export interface PostPublishResponse {
	postId: number;
	slug: string;
}

export interface PublishPostRequest {
	slug: string;
	request: PostPublishRequest;
}

export interface AuthorResponse {
	userId: number;
	name?: string;
	nickname?: string;
	slug: string;
	profileImageUrl: string | null;
}

interface BaseOwnerResponse {
	type: 'COLOG' | 'RILOG';
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

export interface CologPublicProfileResponse {
	type: string;
	id: number;
	name: string;
	slug: string;
	introduction: string | null;
	profileImageUrl: string | null;
	coverImageUrl: string | null;
	serviceUrl: string | null;
	githubUrl: string | null;
	memberCount: number;
	postCount: number;
}

export interface BlogPublicProfileRequest {
	slug: string;
}

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

export interface PublicBlogFeedPostResponse {
	type: 'COLOG' | 'RILOG';
	posts: PostItemResponse[];
	page: number;
	size: number;
	numberOfElements: number;
	hasNext: boolean;
}

export interface PublicBlogFeedPostsRequest {
	slug: string;
	page: number;
	size: number;
}
