import type { Block } from '@blocknote/core';

import type { BaseBlog, Blog } from '@/domains/blog/model/blog';
import type { User } from '@/domains/user/model/user';

export const POST_TITLE_MAX_LENGTH = 512;

export const POST_CATEGORY_OPTIONS = [
	{ value: 'IT', label: 'IT' },
	{ value: 'DAILY', label: '일상' },
] as const;

export type PostCategory = (typeof POST_CATEGORY_OPTIONS)[number]['value'];

export interface PostSummary {
	id: number;
	title: string;
	publishedAt: string;
	thumbnailUrl: string | null;
	author: User;
}

export interface PostViewerPermissions {
	canEdit: boolean;
	canDelete: boolean;
}

export interface PostDetailChapter {
	id: number;
	name: string;
	order: number;
}

export interface PostDetailAuthor extends User {
	description: string | null;
}

export interface PostDetail extends PostSummary {
	author: PostDetailAuthor;
	content: Block[];
	category: PostCategory;
	chapter: PostDetailChapter | null;
	blog: Blog;
	viewerPermissions: PostViewerPermissions;
}

export interface PostFeedItem extends PostSummary {
	chapterName: string | null;
	blog: BaseBlog;
}

export interface PostFeedPage {
	items: PostFeedItem[];
	page: number;
	hasNext: boolean;
}
