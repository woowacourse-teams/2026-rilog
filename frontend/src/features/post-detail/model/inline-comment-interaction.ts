export type InlineCommentOpenSource = 'highlight' | 'block';

export interface InlineCommentSelectionTarget {
	readonly blockId: string;
	readonly startOffset: number;
	readonly endOffset: number;
	readonly selectedText: string;
}

export interface InlineCommentOpenRequest {
	blockId: string;
	anchorIds: readonly number[];
	source: InlineCommentOpenSource;
}

export type InlineCommentSidebarMode = 'all' | 'block' | 'single';
