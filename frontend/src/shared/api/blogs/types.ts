export interface BlogDetailRequest {
	slug: string;
	postId: number;
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
	logoImageUrl: string | null;
	coverImageUrl: string | null;
	memberCount: number;
	postCount: number;
}

export type PostOwnerResponse = RilogOwnerResponse | CologOwnerResponse;

export interface PostDetailResponse {
	title: string;
	content: unknown;
	publishedAt: string;
	thumbnailImageUrl: string | null;
	category: string;
	author: AuthorResponse;
	owner: PostOwnerResponse;
}
