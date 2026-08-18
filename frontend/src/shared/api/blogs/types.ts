export interface BlogDetailRequest {
	slug: string;
	postId: number;
}

export interface AuthorResponse {
	userId: number;
	nickname: string;
	slug: string;
	profileImageUrl: string;
}

interface BaseOwnerResponse {
	type: 'COLOG' | 'RILOG';
	blogId: number;
	slug: string;
	name: string;
}

export interface RilogOwnerResponse extends BaseOwnerResponse {
	type: 'RILOG';
	profileImageUrl: string;
}

export interface CologOwnerResponse extends BaseOwnerResponse {
	type: 'COLOG';
	logoImageUrl: string;
	coverImageUrl: string;
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
