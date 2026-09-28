import type { InlineCommentAnchorModel } from '@/features/post-detail/model/inline-comment';

import { getInlineCommentTextOffset } from './inline-comment-selection';

interface CaretBoundary {
	node: Node;
	offset: number;
}

const getCaretBoundaryAtPoint = (document: Document, x: number, y: number): CaretBoundary | null => {
	const caretPosition = document.caretPositionFromPoint?.(x, y);
	if (caretPosition !== undefined && caretPosition !== null) {
		return { node: caretPosition.offsetNode, offset: caretPosition.offset };
	}

	if (typeof document.caretRangeFromPoint !== 'function') {
		return null;
	}

	const caretRange = document.caretRangeFromPoint(x, y);
	if (caretRange === null) {
		return null;
	}

	return { node: caretRange.startContainer, offset: caretRange.startOffset };
};

export const getInlineCommentOffsetAtPoint = (root: HTMLElement, x: number, y: number): number | null => {
	const boundary = getCaretBoundaryAtPoint(root.ownerDocument, x, y);
	if (boundary === null) {
		return null;
	}

	return getInlineCommentTextOffset(root, boundary.node, boundary.offset);
};

export const findLastActiveInlineCommentAnchorAtOffset = (
	anchors: readonly InlineCommentAnchorModel[],
	offset: number,
): InlineCommentAnchorModel | null => {
	let matchedAnchor: InlineCommentAnchorModel | null = null;

	anchors.forEach((anchor) => {
		if (anchor.state === 'ACTIVE' && anchor.range.startOffset <= offset && offset < anchor.range.endOffset) {
			matchedAnchor = anchor;
		}
	});

	return matchedAnchor;
};
