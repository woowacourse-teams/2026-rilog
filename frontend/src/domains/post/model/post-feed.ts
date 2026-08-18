import type { PostSummary } from './post-summary';

export interface PostFeedColog {
	name: string;
	slug: string;
	logoUrl: string | null;
}

export interface PostFeedItem extends PostSummary {
	colog: PostFeedColog | null;
}

export interface PostFeedPage {
	items: PostFeedItem[];
	page: number;
	hasNext: boolean;
}
