import type { Block } from '@blocknote/core';

import type { BaseBlog, Blog } from '@/domains/blog/model/blog';
import type { OrderedChapter } from '@/domains/chapter/model/chapter';
import type { User } from '@/domains/user/model/user';

export const POST_TITLE_MAX_LENGTH = 512;

export const POST_CATEGORY_OPTIONS = [
	{ value: 'TECH', label: '기술' },
	{ value: 'DAILY', label: '일상' },
	{ value: 'RETROSPECT', label: '회고' },
] as const;

export type PostCategory = (typeof POST_CATEGORY_OPTIONS)[number]['value'];
export type PostCategoryLabel = (typeof POST_CATEGORY_OPTIONS)[number]['label'];

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

export interface PostDetailAuthor extends User {
	description: string | null;
}

export interface PostDetail extends PostSummary {
	author: PostDetailAuthor;
	content: Block[];
	category: PostCategory;
	chapter: OrderedChapter | null;
	blog: Blog;
	viewerPermissions: PostViewerPermissions;
}

export interface PostFeedItem extends PostSummary {
	chapterName: string | null;
	categoryLabel?: string | null;
	blog: BaseBlog;
}

export interface PostFeedPage {
	items: PostFeedItem[];
	page: number;
	hasNext: boolean;
}
