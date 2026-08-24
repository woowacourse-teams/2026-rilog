export interface PostsCountResponse {
	totalPostsCount: number;
}

export interface PostDetailRequest {
	postId: number;
}

interface PostDetailAuthorResponse {
	userId: number;
	name?: string;
	nickname?: string;
	slug: string;
	profileImageUrl: string | null;
}

interface BasePostDetailOwnerResponse {
	type: 'COLOG' | 'RILOG';
	blogId: number;
	slug: string;
	name: string;
}

interface RilogPostDetailOwnerResponse extends BasePostDetailOwnerResponse {
	type: 'RILOG';
	profileImageUrl: string | null;
}

interface CologPostDetailOwnerResponse extends BasePostDetailOwnerResponse {
	type: 'COLOG';
	profileImageUrl: string | null;
	coverImageUrl: string | null;
	memberCount: number;
	postCount: number;
}

type PostDetailOwnerResponse = RilogPostDetailOwnerResponse | CologPostDetailOwnerResponse;

export interface PostDetailResponse {
	title: string;
	content: unknown;
	publishedAt: string;
	thumbnailImageUrl: string | null;
	category: string;
	author: PostDetailAuthorResponse;
	owner: PostDetailOwnerResponse;
}
