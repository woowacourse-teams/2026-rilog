'use client';

import { useEffect, useRef } from 'react';

import type { RenderedAnchor, RenderedBlock } from '../lib/inline-comment-highlight-layer';
import type { InlineCommentBlockModel } from '../model/inline-comment';
import type { InlineCommentOpenRequest } from '../model/inline-comment-interaction';

import CommentIcon from '@/shared/assets/icons/comment.svg';

import {
	HIGHLIGHT_LAYER_SELECTOR,
	prepareHighlightLayers,
	removeHighlightLayers,
} from '../lib/inline-comment-highlight-layer';
import {
	findLastActiveInlineCommentAnchorAtOffset,
	getInlineCommentOffsetAtPoint,
} from '../lib/inline-comment-interaction';

interface InlineCommentHighlightsProps {
	article: HTMLElement;
	blocks: readonly InlineCommentBlockModel[];
	contentKey: string;
	onOpenComments?: (request: InlineCommentOpenRequest) => void;
}

export default function InlineCommentHighlights({
	article,
	blocks,
	contentKey,
	onOpenComments,
}: InlineCommentHighlightsProps) {
	const iconTemplateRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		let isMounted = true;
		let activeAnchor: RenderedAnchor | null = null;
		let renderedBlocksByRoot = new Map<HTMLElement, RenderedBlock>();
		let lastDrawnSize: { width: number; height: number } | null = null;
		let isFirstResizeNotification = true;

		const clearActiveAnchor = () => {
			activeAnchor?.lines.forEach((line) => delete line.dataset.inlineCommentActive);
			if (activeAnchor !== null) {
				delete activeAnchor.root.dataset.inlineCommentPointer;
			}
			activeAnchor = null;
		};

		const setActiveAnchor = (nextAnchor: RenderedAnchor | null) => {
			if (activeAnchor === nextAnchor) return;

			clearActiveAnchor();
			activeAnchor = nextAnchor;
			nextAnchor?.lines.forEach((line) => (line.dataset.inlineCommentActive = ''));
			if (nextAnchor !== null) {
				nextAnchor.root.dataset.inlineCommentPointer = '';
			}
		};

		const drawHighlights = () => {
			const { width, height } = article.getBoundingClientRect();
			lastDrawnSize = { width, height };
			const preparedLayers = prepareHighlightLayers({
				article,
				blocks,
				icon: iconTemplateRef.current?.firstElementChild ?? null,
				onActiveAnchorChange: setActiveAnchor,
				onOpenComments,
			});
			clearActiveAnchor();
			removeHighlightLayers(article);
			preparedLayers.forEach(({ host, layer }) => {
				host.dataset.inlineCommentHighlightHost = '';
				host.append(layer);
			});
			renderedBlocksByRoot = new Map(preparedLayers.map(({ root, renderedBlock }) => [root, renderedBlock]));
		};

		const findPointerAnchor = (event: PointerEvent | MouseEvent): RenderedAnchor | null => {
			if (!(event.target instanceof Element)) return null;

			const root = event.target.closest<HTMLElement>('[data-inline-comment-root]');
			if (root === null) return null;

			const renderedBlock = renderedBlocksByRoot.get(root);
			if (renderedBlock === undefined) return null;

			const offset = getInlineCommentOffsetAtPoint(root, event.clientX, event.clientY);
			if (offset === null) return null;

			const renderedAnchors = renderedBlock.block.anchors.filter((anchor) =>
				renderedBlock.anchorsById.has(anchor.anchorId),
			);
			const anchor = findLastActiveInlineCommentAnchorAtOffset(renderedAnchors, offset);
			return anchor === null ? null : (renderedBlock.anchorsById.get(anchor.anchorId) ?? null);
		};

		const handlePointerMove = (event: PointerEvent) => setActiveAnchor(findPointerAnchor(event));
		const handlePointerLeave = () => setActiveAnchor(null);
		const handleClick = (event: MouseEvent) => {
			if (event.target instanceof Element && event.target.closest(HIGHLIGHT_LAYER_SELECTOR) !== null) return;

			const selection = article.ownerDocument.getSelection();
			if (selection !== null && !selection.isCollapsed) return;

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
		window.addEventListener('resize', drawHighlights);

		const handleObservedResize = () => {
			if (isFirstResizeNotification) {
				isFirstResizeNotification = false;
				const { width, height } = article.getBoundingClientRect();
				if (lastDrawnSize?.width === width && lastDrawnSize.height === height) return;
			}
			drawHighlights();
		};
		const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(handleObservedResize);
		resizeObserver?.observe(article);

		const fonts = article.ownerDocument.fonts;
		if (fonts && fonts.status !== 'loaded') {
			void fonts.ready.then(() => {
				if (isMounted) drawHighlights();
			});
		}

		return () => {
			isMounted = false;
			article.removeEventListener('pointermove', handlePointerMove);
			article.removeEventListener('pointerleave', handlePointerLeave);
			article.removeEventListener('click', handleClick);
			window.removeEventListener('resize', drawHighlights);
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
