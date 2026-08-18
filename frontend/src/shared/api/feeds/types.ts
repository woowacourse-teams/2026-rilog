export interface FullFeedPostsRequest {
	page: number;
	size: number;
}

export interface AuthorResponse {
	userId: number;
	nickname: string;
	slug: string;
	profileImageUrl: string;
}

export interface BlogResponse {
	blogId: number;
	name: string;
	slug: string;
	profileUrl: string;
}

export interface PostItemResponse {
	postId: number;
	title: string;
	thumbnailUrl: string;
	category: string;
	visibility: string;
	publishedAt: string;
	user: AuthorResponse;
	blog: BlogResponse;
}

export interface FullFeedPostResponse {
	posts: PostItemResponse[];
	page: number;
	size: number;
	numberOfElements: number;
	hasNext: boolean;
}
