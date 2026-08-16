import type { Block } from '@blocknote/core';

export interface PostDetailAuthor {
	nickname: string;
	slug: string;
}

export interface PostDetailCoLog {
	name: string;
	slug: string;
	description: string;
	memberCount: number;
	postCount: number;
}

export interface PostDetail {
	title: string;
	content: Block[];
	publishedAt: string;
	thumbnailImageUrl: string | null;
	author: PostDetailAuthor;
	colog: PostDetailCoLog | null;
}
