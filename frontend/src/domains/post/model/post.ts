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

export interface PostDetail extends PostSummary {
	content: Block[];
	category: PostCategory;
	blog: Blog;
	viewerPermissions: PostViewerPermissions;
}

export interface PostFeedItem extends PostSummary {
	blog: BaseBlog;
}

export interface PostFeedPage {
	items: PostFeedItem[];
	page: number;
	hasNext: boolean;
}
