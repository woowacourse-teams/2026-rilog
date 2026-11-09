import type { InlineCommentAnchorModel, InlineCommentBlockModel } from '../model/inline-comment';
import type { InlineCommentOpenRequest } from '../model/inline-comment-interaction';

import { formatCommentCount } from './format-comment-count';
import { normalizeInlineCommentHighlightRects } from './inline-comment-highlight-rects';
import { findInlineCommentRoot, restoreInlineCommentRange } from './inline-comment-range';

export interface RenderedAnchor {
	blockId: string;
	anchor: InlineCommentAnchorModel;
	root: HTMLElement;
	lines: HTMLElement[];
}

export interface RenderedBlock {
	block: InlineCommentBlockModel;
	anchorsById: Map<number, RenderedAnchor>;
}

interface MeasuredAnchor {
	anchor: InlineCommentAnchorModel;
	anchorIndex: number;
	rects: ReturnType<typeof normalizeInlineCommentHighlightRects>;
}

interface MeasuredBlock {
	block: InlineCommentBlockModel;
	root: HTMLElement;
	host: HTMLElement;
	hostRect: DOMRect;
	scrollLeft: number;
	scrollTop: number;
	activeAnchors: InlineCommentAnchorModel[];
	anchors: MeasuredAnchor[];
}

export interface PreparedLayer {
	root: HTMLElement;
	host: HTMLElement;
	layer: HTMLElement;
	renderedBlock: RenderedBlock;
}

export const HIGHLIGHT_LAYER_SELECTOR = '[data-inline-comment-highlight-layer]';
const HIGHLIGHT_LINE_HEIGHT_PX = 2;
const HIGHLIGHT_VERTICAL_OFFSET_PX = 4;

export const removeHighlightLayers = (article: HTMLElement) => {
	article.querySelectorAll<HTMLElement>(HIGHLIGHT_LAYER_SELECTOR).forEach((layer) => {
		const host = layer.parentElement;
		layer.remove();
		if (host?.querySelector(HIGHLIGHT_LAYER_SELECTOR) === null) {
			delete host.dataset.inlineCommentHighlightHost;
		}
	});
};

const measureHighlightBlocks = (article: HTMLElement, blocks: readonly InlineCommentBlockModel[]): MeasuredBlock[] =>
	blocks.flatMap((block) => {
		const root = findInlineCommentRoot(article, block.blockId);
		if (root === null) return [];

		const host = root.closest<HTMLElement>('.bn-block-outer[data-id]');
		if (host === null) return [];

		const activeAnchors = block.anchors.filter((anchor) => anchor.state === 'ACTIVE');
		if (activeAnchors.length === 0) return [];

		const hostRect = host.getBoundingClientRect();
		const scrollLeft = host.scrollLeft;
		const scrollTop = host.scrollTop;
		const rootRange = host.ownerDocument.createRange();
		rootRange.selectNodeContents(root);
		const rootRects = Array.from(rootRange.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);

		const anchors = block.anchors.flatMap((anchor, anchorIndex) => {
			if (anchor.state !== 'ACTIVE') return [];
			const range = restoreInlineCommentRange(root, anchor.range);
			if (range === null) return [];

			const rects = normalizeInlineCommentHighlightRects(
				Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0),
				rootRects,
			);
			return rects.length === 0 ? [] : [{ anchor, anchorIndex, rects }];
		});

		return [{ block, root, host, hostRect, scrollLeft, scrollTop, activeAnchors, anchors }];
	});

interface PrepareLayersOptions {
	article: HTMLElement;
	blocks: readonly InlineCommentBlockModel[];
	icon: Element | null;
	onActiveAnchorChange: (anchor: RenderedAnchor | null) => void;
	onOpenComments?: (request: InlineCommentOpenRequest) => void;
}

export const prepareHighlightLayers = ({
	article,
	blocks,
	icon,
	onActiveAnchorChange,
	onOpenComments,
}: PrepareLayersOptions): PreparedLayer[] =>
	measureHighlightBlocks(article, blocks).map((measuredBlock) => {
		const { block, root, host, hostRect, scrollLeft, scrollTop, activeAnchors, anchors } = measuredBlock;
		const layer = host.ownerDocument.createElement('span');
		layer.dataset.inlineCommentHighlightLayer = '';
		const renderedBlock: RenderedBlock = { block, anchorsById: new Map() };

		anchors.forEach(({ anchor, anchorIndex, rects }) => {
			const renderedAnchor: RenderedAnchor = {
				blockId: block.blockId,
				anchor,
				root,
				lines: [],
			};
			renderedBlock.anchorsById.set(anchor.anchorId, renderedAnchor);

			rects.forEach((rect) => {
				const line = host.ownerDocument.createElement('span');
				line.dataset.inlineCommentHighlight = '';
				line.dataset.inlineCommentAnchorId = String(anchor.anchorId);
				line.dataset.inlineCommentAnchorOrder = String(anchorIndex);
				line.setAttribute('aria-hidden', 'true');
				line.style.left = `${rect.left - hostRect.left + scrollLeft}px`;
				line.style.top = `${rect.bottom - hostRect.top + scrollTop - HIGHLIGHT_LINE_HEIGHT_PX}px`;
				line.style.width = `${rect.width}px`;
				line.style.setProperty(
					'--inline-comment-highlight-expanded-height',
					`${rect.height + HIGHLIGHT_VERTICAL_OFFSET_PX}px`,
				);
				line.style.setProperty('--inline-comment-anchor-order', String(anchorIndex));
				layer.append(line);
				renderedAnchor.lines.push(line);
			});

			const focusProxy = host.ownerDocument.createElement('button');
			focusProxy.type = 'button';
			focusProxy.dataset.inlineCommentAnchorProxy = '';
			focusProxy.setAttribute('aria-label', `인용 “${anchor.selectedText}”의 댓글 ${anchor.commentCount}개 보기`);
			focusProxy.addEventListener('focus', () => onActiveAnchorChange(renderedAnchor));
			focusProxy.addEventListener('blur', () => onActiveAnchorChange(null));
			focusProxy.addEventListener('click', () => {
				onOpenComments?.({ blockId: block.blockId, anchorIds: [anchor.anchorId], source: 'highlight' });
			});
			layer.append(focusProxy);
		});

		const commentCount = activeAnchors.reduce((count, anchor) => count + anchor.commentCount, 0);
		const blockButton = host.ownerDocument.createElement('button');
		blockButton.type = 'button';
		blockButton.dataset.inlineCommentBlockButton = '';
		blockButton.setAttribute('aria-label', `이 블록의 댓글 ${commentCount}개 보기`);
		if (icon) blockButton.append(icon.cloneNode(true));
		const count = host.ownerDocument.createElement('span');
		count.textContent = String(formatCommentCount(commentCount));
		blockButton.append(count);
		blockButton.addEventListener('click', () => {
			onOpenComments?.({
				blockId: block.blockId,
				anchorIds: activeAnchors.map((anchor) => anchor.anchorId),
				source: 'block',
			});
		});
		layer.append(blockButton);
		return { root, host, layer, renderedBlock };
	});
