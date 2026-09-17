import type { Block } from '@blocknote/core';

import type { PostCategory, PostCategoryLabel } from '@/domains/post/model/post';
import type { ChapterResponse } from '@/shared/api/blogs/types';

export type PostCategoryRequest = PostCategory;
export type PostCategoryResponse = PostCategoryLabel;
export type PostVisibilityRequest = 'PUBLIC' | 'PRIVATE';

export interface PostWriteRequest {
	slug: string;
	title: string;
	content: Block[];
	category: PostCategoryRequest;
	visibility: PostVisibilityRequest;
	thumbnailImageUrl: string | null;
	chapterId: number | null;
}

export interface PostWriteResponse {
	postId: number;
	slug: string;
}

export interface PostsCountResponse {
	totalPostsCount: number;
}

export type InlineCommentAnchorState = 'ACTIVE' | 'OUTDATED';

export interface InlineCommentRangeResponse {
	startOffset: number;
	endOffset: number;
}

export interface InlineCommentAuthorResponse {
	userId: number;
	nickname: string;
	slug: string;
	profileImageUrl: string | null;
	isAuthor: boolean;
	isBlogMember: boolean;
}

export interface InlineCommentResponse {
	commentId: number;
	content: string;
	author: InlineCommentAuthorResponse;
	canEdit: boolean;
	canDelete: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface InlineCommentAnchorResponse {
	anchorId: number;
	range: InlineCommentRangeResponse;
	selectedText: string;
	state: InlineCommentAnchorState;
	comments: InlineCommentResponse[];
}

export interface InlineCommentBlockResponse {
	blockId: string;
	anchors: InlineCommentAnchorResponse[];
}

export interface PostDetailRequest {
	slug: string;
	postId: number;
}

interface PostDetailAuthorResponse {
	userId: number;
	name?: string;
	nickname?: string;
	slug: string;
	profileImageUrl: string | null;
}

interface BasePostDetailOwnerResponse {
	type: 'COLOG' | 'RILOG';
	blogId: number;
	slug: string;
	name: string;
}

interface RilogPostDetailOwnerResponse extends BasePostDetailOwnerResponse {
	type: 'RILOG';
	profileImageUrl: string | null;
}

interface CologPostDetailOwnerResponse extends BasePostDetailOwnerResponse {
	type: 'COLOG';
	profileImageUrl: string | null;
	coverImageUrl: string | null;
	memberCount: number;
	postCount: number;
}

type PostDetailOwnerResponse = RilogPostDetailOwnerResponse | CologPostDetailOwnerResponse;

interface PostViewerPermissionsResponse {
	canEdit: boolean;
	canDelete: boolean;
}

export interface PostDetailResponse {
	title: string;
	content: unknown;
	publishedAt: string;
	thumbnailImageUrl: string | null;
	category: PostCategoryResponse;
	chapter: ChapterResponse | null;
	author: PostDetailAuthorResponse;
	owner: PostDetailOwnerResponse;
	viewerPermissions: PostViewerPermissionsResponse;
}
