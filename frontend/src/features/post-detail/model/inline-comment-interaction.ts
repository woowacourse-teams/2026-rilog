export type InlineCommentOpenSource = 'highlight' | 'block';

export interface InlineCommentOpenRequest {
	blockId: string;
	anchorIds: readonly number[];
	source: InlineCommentOpenSource;
}

export type InlineCommentSidebarMode = 'all' | 'block' | 'single';
