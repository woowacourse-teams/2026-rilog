export type InlineCommentAnchorState = 'ACTIVE' | 'OUTDATED';

export interface InlineCommentRangeModel {
	startOffset: number;
	endOffset: number;
}

export interface InlineCommentAuthorModel {
	userId: number;
	nickname: string;
	slug: string;
	profileImageUrl: string | null;
	isAuthor: boolean;
	isBlogMember: boolean;
}

export interface InlineCommentModel {
	commentId: number;
	content: string;
	author: InlineCommentAuthorModel;
	canEdit: boolean;
	canDelete: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface InlineCommentAnchorModel {
	anchorId: number;
	commentCount: number;
	range: InlineCommentRangeModel;
	selectedText: string;
	state: InlineCommentAnchorState;
	comments: InlineCommentModel[];
}

export interface InlineCommentBlockModel {
	blockId: string;
	anchors: InlineCommentAnchorModel[];
}
