import type { InlineCommentAnchorModel } from '@/features/post-detail/model/inline-comment';

export interface InlineCommentThreadModel {
	blockId: string;
	anchor: InlineCommentAnchorModel;
}
