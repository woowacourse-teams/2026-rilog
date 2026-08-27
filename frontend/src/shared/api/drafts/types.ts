import type { Block } from '@blocknote/core';

export interface DraftSaveRequest {
	title: string;
	content: Block[];
}

export interface DraftSaveResponse {
	draftId: number;
}
