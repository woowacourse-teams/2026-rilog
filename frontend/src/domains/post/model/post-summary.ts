export interface PostAuthorSummary {
	nickname: string;
	slug: string;
	profileImageUrl: string | null;
}

export interface PostSummary {
	id: number;
	title: string;
	thumbnailUrl: string | null;
	publishedAt: string;
	author: PostAuthorSummary;
}
