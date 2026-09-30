'use client';

import { useLayoutEffect, useRef } from 'react';

import type { InlineCommentOpenRequest } from '../model/inline-comment-interaction';

import type { InlineCommentAnchorModel, InlineCommentBlockModel } from '@/features/post-detail/model/inline-comment';
import CommentIcon from '@/shared/assets/icons/comment.svg';

import { formatCommentCount } from '../lib/format-comment-count';
import { normalizeInlineCommentHighlightRects } from '../lib/inline-comment-highlight-rects';
import {
	findLastActiveInlineCommentAnchorAtOffset,
	getInlineCommentOffsetAtPoint,
} from '../lib/inline-comment-interaction';
import { findInlineCommentRoot, restoreInlineCommentRange } from '../lib/inline-comment-range';

interface InlineCommentHighlightsProps {
	article: HTMLElement;
	blocks: readonly InlineCommentBlockModel[];
	contentKey: string;
	onOpenComments?: (request: InlineCommentOpenRequest) => void;
}

interface RenderedAnchor {
	blockId: string;
	anchor: InlineCommentAnchorModel;
	root: HTMLElement;
	range: Range;
	lines: HTMLElement[];
}

interface RenderedBlock {
	block: InlineCommentBlockModel;
	anchorsById: Map<number, RenderedAnchor>;
}

const HIGHLIGHT_LAYER_SELECTOR = '[data-inline-comment-highlight-layer]';
const HIGHLIGHT_LINE_HEIGHT_PX = 2;
const HIGHLIGHT_VERTICAL_OFFSET_PX = 4;

const removeHighlightLayers = (article: HTMLElement) => {
	article.querySelectorAll<HTMLElement>(HIGHLIGHT_LAYER_SELECTOR).forEach((layer) => {
		const host = layer.parentElement;
		layer.remove();
		if (host?.querySelector(HIGHLIGHT_LAYER_SELECTOR) === null) {
			delete host.dataset.inlineCommentHighlightHost;
		}
	});
};

export default function InlineCommentHighlights({
	article,
	blocks,
	contentKey,
	onOpenComments,
}: InlineCommentHighlightsProps) {
	const iconTemplateRef = useRef<HTMLSpanElement>(null);
	useLayoutEffect(() => {
		let isMounted = true;
		let activeAnchor: RenderedAnchor | null = null;
		let renderedBlocksByRoot = new Map<HTMLElement, RenderedBlock>();

		const clearActiveAnchor = () => {
			activeAnchor?.lines.forEach((line) => delete line.dataset.inlineCommentActive);
			if (activeAnchor !== null) {
				delete activeAnchor.root.dataset.inlineCommentPointer;
			}
			activeAnchor = null;
		};

		const setActiveAnchor = (nextAnchor: RenderedAnchor | null) => {
			if (activeAnchor === nextAnchor) {
				return;
			}

			clearActiveAnchor();
			activeAnchor = nextAnchor;
			nextAnchor?.lines.forEach((line) => (line.dataset.inlineCommentActive = ''));
			if (nextAnchor !== null) {
				nextAnchor.root.dataset.inlineCommentPointer = '';
			}
		};

		const drawHighlights = () => {
			clearActiveAnchor();
			removeHighlightLayers(article);
			renderedBlocksByRoot = new Map();

			blocks.forEach((block) => {
				const root = findInlineCommentRoot(article, block.blockId);
				if (root === null) {
					return;
				}

				const host = root.closest<HTMLElement>('.bn-block-outer[data-id]');
				if (host === null) {
					return;
				}

				const activeAnchors = block.anchors.filter((anchor) => anchor.state === 'ACTIVE');
				if (activeAnchors.length === 0) {
					return;
				}

				const layer = host.ownerDocument.createElement('span');
				layer.dataset.inlineCommentHighlightLayer = '';
				host.dataset.inlineCommentHighlightHost = '';
				host.append(layer);

				const renderedBlock: RenderedBlock = { block, anchorsById: new Map() };
				renderedBlocksByRoot.set(root, renderedBlock);
				const hostRect = host.getBoundingClientRect();
				const rootRange = host.ownerDocument.createRange();
				rootRange.selectNodeContents(root);
				const rootRects = Array.from(rootRange.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);

				block.anchors.forEach((anchor, anchorIndex) => {
					if (anchor.state !== 'ACTIVE') {
						return;
					}

					const range = restoreInlineCommentRange(root, anchor.range);
					if (range === null) {
						return;
					}

					const rects = normalizeInlineCommentHighlightRects(
						Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0),
						rootRects,
					);
					if (rects.length === 0) {
						return;
					}

					const renderedAnchor: RenderedAnchor = {
						blockId: block.blockId,
						anchor,
						root,
						range,
						lines: [],
					};
					renderedBlock.anchorsById.set(anchor.anchorId, renderedAnchor);

					rects.forEach((rect) => {
						const line = host.ownerDocument.createElement('span');
						line.dataset.inlineCommentHighlight = '';
						line.dataset.inlineCommentAnchorId = String(anchor.anchorId);
						line.dataset.inlineCommentAnchorOrder = String(anchorIndex);
						line.setAttribute('aria-hidden', 'true');
						line.style.left = `${rect.left - hostRect.left + host.scrollLeft}px`;
						line.style.top = `${rect.bottom - hostRect.top + host.scrollTop - HIGHLIGHT_LINE_HEIGHT_PX}px`;
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
					focusProxy.addEventListener('focus', () => setActiveAnchor(renderedAnchor));
					focusProxy.addEventListener('blur', () => setActiveAnchor(null));
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
				// React가 렌더한 공통 SVG를 기존 DOM 하이라이트 레이어에 복제한다.
				const icon = iconTemplateRef.current?.firstElementChild;
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
			});
		};

		const findPointerAnchor = (event: PointerEvent | MouseEvent): RenderedAnchor | null => {
			if (!(event.target instanceof Element)) {
				return null;
			}

			const root = event.target.closest<HTMLElement>('[data-inline-comment-root]');
			if (root === null) {
				return null;
			}

			const renderedBlock = renderedBlocksByRoot.get(root);
			if (renderedBlock === undefined) {
				return null;
			}

			const offset = getInlineCommentOffsetAtPoint(root, event.clientX, event.clientY);
			if (offset === null) {
				return null;
			}

			const renderedAnchors = renderedBlock.block.anchors.filter((anchor) =>
				renderedBlock.anchorsById.has(anchor.anchorId),
			);
			const anchor = findLastActiveInlineCommentAnchorAtOffset(renderedAnchors, offset);
			return anchor === null ? null : (renderedBlock.anchorsById.get(anchor.anchorId) ?? null);
		};

		const handlePointerMove = (event: PointerEvent) => setActiveAnchor(findPointerAnchor(event));
		const handlePointerLeave = () => setActiveAnchor(null);
		const handleClick = (event: MouseEvent) => {
			if (event.target instanceof Element && event.target.closest(HIGHLIGHT_LAYER_SELECTOR) !== null) {
				return;
			}

			const selection = article.ownerDocument.getSelection();
			if (selection !== null && !selection.isCollapsed) {
				return;
			}

			const renderedAnchor = findPointerAnchor(event);
			if (renderedAnchor !== null) {
				onOpenComments?.({
					blockId: renderedAnchor.blockId,
					anchorIds: [renderedAnchor.anchor.anchorId],
					source: 'highlight',
				});
			}
		};

		drawHighlights();
		article.addEventListener('pointermove', handlePointerMove);
		article.addEventListener('pointerleave', handlePointerLeave);
		article.addEventListener('click', handleClick);
		const handleResize = () => drawHighlights();
		window.addEventListener('resize', handleResize);

		const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(drawHighlights);
		resizeObserver?.observe(article);

		void article.ownerDocument.fonts?.ready.then(() => {
			if (isMounted) {
				drawHighlights();
			}
		});

		return () => {
			isMounted = false;
			article.removeEventListener('pointermove', handlePointerMove);
			article.removeEventListener('pointerleave', handlePointerLeave);
			article.removeEventListener('click', handleClick);
			window.removeEventListener('resize', handleResize);
			resizeObserver?.disconnect();
			clearActiveAnchor();
			removeHighlightLayers(article);
		};
	}, [article, blocks, contentKey, onOpenComments]);

	return (
		<span ref={iconTemplateRef} hidden aria-hidden="true">
			<CommentIcon aria-hidden="true" focusable="false" />
		</span>
	);
}
