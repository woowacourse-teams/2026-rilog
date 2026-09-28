import type { InlineCommentSelectionTarget } from '../model/inline-comment-interaction';

export interface InlineCommentSelectionDraft extends InlineCommentSelectionTarget {
	readonly range: Range;
}

const INLINE_COMMENT_ROOT_SELECTOR = '[data-inline-comment-root][data-inline-comment-block-id]';

const clipRangeToRoot = (sourceRange: Range, root: HTMLElement): Range | null => {
	try {
		const rootRange = root.ownerDocument.createRange();
		rootRange.selectNodeContents(root);
		const clippedRange = sourceRange.cloneRange();
		if (sourceRange.compareBoundaryPoints(Range.START_TO_START, rootRange) < 0) {
			clippedRange.setStart(rootRange.startContainer, rootRange.startOffset);
		}
		if (sourceRange.compareBoundaryPoints(Range.END_TO_END, rootRange) > 0) {
			clippedRange.setEnd(rootRange.endContainer, rootRange.endOffset);
		}
		return clippedRange.collapsed ? null : clippedRange;
	} catch {
		return null;
	}
};

export const getInlineCommentTextOffset = (root: HTMLElement, container: Node, offset: number): number | null => {
	if (!root.contains(container) && root !== container) {
		return null;
	}

	try {
		const range = root.ownerDocument.createRange();
		range.selectNodeContents(root);
		range.setEnd(container, offset);
		return getInlineCommentText(range.cloneContents()).length;
	} catch {
		return null;
	}
};

export const getInlineCommentRootText = (root: HTMLElement): string => {
	return getInlineCommentText(root);
};

const getInlineCommentText = (root: Node): string => {
	let text = '';
	const ownerDocument = root.ownerDocument;
	if (ownerDocument === null) return text;
	const walker = ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
	let currentNode = walker.nextNode();
	while (currentNode !== null) {
		if (currentNode.nodeType === Node.TEXT_NODE) text += currentNode.nodeValue ?? '';
		else if ((currentNode as Element).tagName === 'BR') text += '\n';
		currentNode = walker.nextNode();
	}
	return text;
};

export const createInlineCommentSelectionDraft = (
	selection: Selection,
	article: HTMLElement,
): InlineCommentSelectionDraft | null => {
	if (selection.rangeCount !== 1 || selection.isCollapsed) {
		return null;
	}

	const sourceRange = selection.getRangeAt(0);
	const roots = Array.from(article.querySelectorAll<HTMLElement>(INLINE_COMMENT_ROOT_SELECTOR));
	const candidates = roots.flatMap((root) => {
		if (!sourceRange.intersectsNode(root)) return [];
		const range = clipRangeToRoot(sourceRange, root);
		if (range === null) return [];
		const blockId = root.dataset.inlineCommentBlockId;
		if (blockId === undefined || blockId.length === 0) return [];
		const startOffset = getInlineCommentTextOffset(root, range.startContainer, range.startOffset);
		const endOffset = getInlineCommentTextOffset(root, range.endContainer, range.endOffset);
		if (startOffset === null || endOffset === null || startOffset >= endOffset) return [];
		const selectedText = getInlineCommentRootText(root).slice(startOffset, endOffset);
		if (selectedText.trim().length === 0) return [];
		return [
			{
				blockId,
				startOffset,
				endOffset,
				selectedText,
				range,
				isCodeBlock: root.closest('[data-content-type="codeBlock"]') !== null,
			},
		];
	});
	if (candidates.length !== 1 || candidates[0].isCodeBlock) return null;
	const draft = candidates[0];

	return {
		blockId: draft.blockId,
		startOffset: draft.startOffset,
		endOffset: draft.endOffset,
		selectedText: draft.selectedText,
		range: draft.range,
	};
};
