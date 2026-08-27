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
