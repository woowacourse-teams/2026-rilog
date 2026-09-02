import type { BlogType } from '@/domains/blog/model/blog';

export interface BlogProfileUpdateRequest {
	name: string;
	profileImageUrl: string | null;
	coverImageUrl: string | null;
	introduction: string | null;
	serviceUrl: string | null;
	githubUrl: string | null;
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

export interface BlogPublicProfileResponse {
	type: BlogType;
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

export interface ChapterIndexResponse {
	chapterId: number;
	name: string;
	postCount: number;
}

export interface CologIndexResponse {
	cologId: number;
	slug: string;
	name: string;
	profileImageUrl: string | null;
	authoredPostCount: number;
}

export interface BlogIndexResponse {
	blogType: BlogType;
	totalCount: number;
	chapterIndexes: ChapterIndexResponse[] | null;
	cologIndexes: CologIndexResponse[] | null;
}

export interface ChapterResponse {
	chapterId: number;
	name: string;
	order: number;
}

export interface ChapterCreateRequest {
	name: string;
}

export interface ChapterRenameRequest {
	name: string;
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
	type: BlogType;
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
	filter: PublicBlogPostsFilter;
}

export type PublicBlogPostsFilter =
	{ type: 'all' } | { type: 'chapterId'; chapterId: number } | { type: 'targetCologSlug'; targetCologSlug: string };
