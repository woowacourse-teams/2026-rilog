export type InlineCommentOpenSource = 'highlight' | 'block';
export type InlineCommentSidebarMode = 'single' | 'block' | 'all';

export interface InlineCommentOpenRequest {
	blockId: string;
	anchorIds: readonly number[];
	source: InlineCommentOpenSource;
}
