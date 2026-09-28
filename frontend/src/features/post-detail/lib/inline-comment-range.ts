import type { InlineCommentRangeModel } from '@/features/post-detail/model/inline-comment';

interface TextBoundary {
	node: Node;
	offset: number;
}

const findTextBoundary = (root: HTMLElement, targetOffset: number): TextBoundary | null => {
	const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
	let traversedOffset = 0;
	let currentNode = walker.nextNode();

	while (currentNode !== null) {
		if (currentNode.nodeType === Node.ELEMENT_NODE && (currentNode as Element).tagName === 'BR') {
			if (targetOffset === traversedOffset) {
				const parent = currentNode.parentNode;
				if (parent === null) return null;
				return { node: parent, offset: Array.prototype.indexOf.call(parent.childNodes, currentNode) };
			}
			traversedOffset += 1;
			if (targetOffset === traversedOffset) {
				const parent = currentNode.parentNode;
				if (parent === null) return null;
				return { node: parent, offset: Array.prototype.indexOf.call(parent.childNodes, currentNode) + 1 };
			}
			currentNode = walker.nextNode();
			continue;
		}
		if (currentNode.nodeType !== Node.TEXT_NODE) {
			currentNode = walker.nextNode();
			continue;
		}
		const textNode = currentNode as Text;
		const nodeLength = textNode.data.length;
		const nextOffset = traversedOffset + nodeLength;

		if (targetOffset <= nextOffset) {
			return { node: textNode, offset: targetOffset - traversedOffset };
		}

		traversedOffset = nextOffset;
		currentNode = walker.nextNode();
	}

	return null;
};

export const findInlineCommentRoot = (article: HTMLElement, blockId: string): HTMLElement | null => {
	const roots = article.querySelectorAll<HTMLElement>('[data-inline-comment-root][data-inline-comment-block-id]');
	return Array.from(roots).find((root) => root.dataset.inlineCommentBlockId === blockId) ?? null;
};

export const restoreInlineCommentRange = (root: HTMLElement, range: InlineCommentRangeModel): Range | null => {
	const { startOffset, endOffset } = range;
	if (!Number.isInteger(startOffset) || !Number.isInteger(endOffset) || startOffset < 0 || endOffset <= startOffset) {
		return null;
	}

	const startBoundary = findTextBoundary(root, startOffset);
	const endBoundary = findTextBoundary(root, endOffset);
	if (startBoundary === null || endBoundary === null) {
		return null;
	}

	try {
		const domRange = root.ownerDocument.createRange();
		domRange.setStart(startBoundary.node, startBoundary.offset);
		domRange.setEnd(endBoundary.node, endBoundary.offset);
		return domRange;
	} catch {
		return null;
	}
};
