import type { Block } from '@blocknote/core';

export interface DraftSaveRequest {
	title: string;
	content: Block[];
}

export interface DraftSaveResponse {
	draftId: number;
}

export interface DraftListRequest {
	page: number;
	size: number;
}

export interface DraftListItemResponse {
	draftId: number;
	title: string;
	publishedAt: string;
}

export interface DraftListResponse {
	drafts: DraftListItemResponse[];
	page: number;
	size: number;
	numberOfElements: number;
	hasNext: boolean;
}

export interface DraftDetailRequest {
	draftId: number;
}

export type DraftStatusResponse = 'PUBLISHED' | 'DRAFT';

export interface DraftDetailResponse {
	draftId: number;
	title: string;
	content: unknown;
	status: DraftStatusResponse;
	publishedAt: string;
}

export type DraftPublishCategoryRequest = 'TECH' | 'DAILY';
export type DraftPublishVisibilityRequest = 'PUBLIC' | 'PRIVATE';

export interface DraftPublishRequest {
	slug: string;
	title: string;
	content: Block[];
	category: DraftPublishCategoryRequest;
	visibility: DraftPublishVisibilityRequest;
	thumbnailImageUrl: string | null;
}

export interface DraftPublishResponse {
	postId: number;
	slug: string;
}
