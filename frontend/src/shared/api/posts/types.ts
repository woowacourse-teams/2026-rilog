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

export interface PostCommentAnchorResponse {
	commentAnchorId: number;
	content: string;
	author: {
		userId: number;
		nickname: string;
		slug: string;
		profileImageUrl: string | null;
		isPostAuthor: boolean;
		isBlogMember: boolean;
	};
	canEdit: boolean;
	canDelete: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface PostCommentAnchorGroupResponse {
	selectionId: number;
	range: { startOffset: number; endOffset: number };
	selectedText: string;
	state: 'ACTIVE' | 'OUTDATED';
	anchorCount: number;
	commentAnchors: PostCommentAnchorResponse[];
}

export interface PostCommentAnchorsResponse {
	blocks: { blockId: string; anchorGroups: PostCommentAnchorGroupResponse[] }[];
}

export interface PostCommentAnchorCreateRequest {
	blockId: string;
	startOffset: number;
	endOffset: number;
	selectedText: string;
	content: string;
}

export interface PostCommentAnchorCreateResponse {
	commentAnchorId: number;
}
