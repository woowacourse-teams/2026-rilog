export interface PostFeedAuthor {
	nickname: string;
	profileImageUrl: string | null;
}

export interface PostFeedCoLog {
	name: string;
	logoUrl: string | null;
}

export interface PostFeedItem {
	id: number;
	title: string;
	thumbnailUrl: string | null;
	publishedAt: string;
	author: PostFeedAuthor;
	colog: PostFeedCoLog | null;
}

export interface PostFeedPage {
	items: PostFeedItem[];
	page: number;
	hasNext: boolean;
}
