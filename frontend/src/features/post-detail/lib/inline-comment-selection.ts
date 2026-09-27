export interface InlineCommentSelectionDraft {
	readonly blockId: string;
	readonly startOffset: number;
	readonly endOffset: number;
	readonly selectedText: string;
	readonly range: Range;
}

const INLINE_COMMENT_ROOT_SELECTOR = '[data-inline-comment-root][data-inline-comment-block-id]';

const getBoundaryElement = (node: Node): Element | null =>
	node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;

const findBoundaryRoot = (node: Node, article: HTMLElement): HTMLElement | null => {
	const root = getBoundaryElement(node)?.closest<HTMLElement>(INLINE_COMMENT_ROOT_SELECTOR) ?? null;
	return root !== null && article.contains(root) ? root : null;
};

export const getInlineCommentTextOffset = (root: HTMLElement, container: Node, offset: number): number | null => {
	if (!root.contains(container) && root !== container) {
		return null;
	}

	try {
		const range = root.ownerDocument.createRange();
		range.selectNodeContents(root);
		range.setEnd(container, offset);
		return range.toString().length;
	} catch {
		return null;
	}
};

export const getInlineCommentRootText = (root: HTMLElement): string => {
	const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let text = '';
	let currentNode = walker.nextNode();

	while (currentNode !== null) {
		text += currentNode.nodeValue ?? '';
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
	if (!article.contains(sourceRange.startContainer) || !article.contains(sourceRange.endContainer)) {
		return null;
	}

	const startRoot = findBoundaryRoot(sourceRange.startContainer, article);
	const endRoot = findBoundaryRoot(sourceRange.endContainer, article);
	if (startRoot === null || startRoot !== endRoot) {
		return null;
	}
	if (startRoot.closest('[data-content-type="codeBlock"]') !== null) {
		return null;
	}

	const blockId = startRoot.dataset.inlineCommentBlockId;
	if (blockId === undefined || blockId.length === 0) {
		return null;
	}

	const startOffset = getInlineCommentTextOffset(startRoot, sourceRange.startContainer, sourceRange.startOffset);
	const endOffset = getInlineCommentTextOffset(startRoot, sourceRange.endContainer, sourceRange.endOffset);
	if (startOffset === null || endOffset === null || startOffset >= endOffset) {
		return null;
	}

	const selectedText = getInlineCommentRootText(startRoot).slice(startOffset, endOffset);
	if (selectedText.trim().length === 0) {
		return null;
	}

	return {
		blockId,
		startOffset,
		endOffset,
		selectedText,
		range: sourceRange.cloneRange(),
	};
};
