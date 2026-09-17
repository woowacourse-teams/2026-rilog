'use client';

import { useLayoutEffect } from 'react';

import type { InlineCommentBlockResponse } from '@/shared/api/posts/types';

import { findInlineCommentRoot, restoreInlineCommentRange } from '../lib/inline-comment-range';

interface InlineCommentHighlightsProps {
	article: HTMLElement;
	blocks: readonly InlineCommentBlockResponse[];
	contentKey: string;
}

const HIGHLIGHT_LAYER_SELECTOR = '[data-inline-comment-highlight-layer]';

const removeHighlightLayers = (article: HTMLElement) => {
	article.querySelectorAll<HTMLElement>(HIGHLIGHT_LAYER_SELECTOR).forEach((layer) => {
		const host = layer.parentElement;
		layer.remove();
		if (host?.querySelector(HIGHLIGHT_LAYER_SELECTOR) === null) {
			delete host.dataset.inlineCommentHighlightHost;
		}
	});
};

export default function InlineCommentHighlights({ article, blocks, contentKey }: InlineCommentHighlightsProps) {
	useLayoutEffect(() => {
		let isActive = true;

		const drawHighlights = () => {
			removeHighlightLayers(article);
			const layersByHost = new Map<HTMLElement, HTMLElement>();

			blocks.forEach((block) => {
				const root = findInlineCommentRoot(article, block.blockId);
				if (root === null) {
					return;
				}

				const host = root.closest<HTMLElement>('.bn-block-outer[data-id]');
				if (host === null) {
					return;
				}

				block.anchors.forEach((anchor, anchorIndex) => {
					if (anchor.state !== 'ACTIVE') {
						return;
					}

					const range = restoreInlineCommentRange(root, anchor.range);
					if (range === null) {
						return;
					}

					const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
					if (rects.length === 0) {
						return;
					}

					let layer = layersByHost.get(host);
					if (layer === undefined) {
						layer = host.ownerDocument.createElement('span');
						layer.dataset.inlineCommentHighlightLayer = '';
						layer.setAttribute('aria-hidden', 'true');
						host.dataset.inlineCommentHighlightHost = '';
						host.append(layer);
						layersByHost.set(host, layer);
					}

					const hostRect = host.getBoundingClientRect();
					rects.forEach((rect) => {
						const highlight = host.ownerDocument.createElement('span');
						highlight.dataset.inlineCommentHighlight = '';
						highlight.dataset.inlineCommentAnchorId = String(anchor.anchorId);
						highlight.dataset.inlineCommentAnchorOrder = String(anchorIndex);
						highlight.style.left = `${rect.left - hostRect.left + host.scrollLeft}px`;
						highlight.style.top = `${rect.top - hostRect.top + host.scrollTop}px`;
						highlight.style.width = `${rect.width}px`;
						highlight.style.setProperty('--inline-comment-anchor-order', String(anchorIndex));
						layer.append(highlight);
					});
				});
			});
		};

		drawHighlights();
		const handleResize = () => drawHighlights();
		window.addEventListener('resize', handleResize);

		const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(drawHighlights);
		resizeObserver?.observe(article);

		void article.ownerDocument.fonts?.ready.then(() => {
			if (isActive) {
				drawHighlights();
			}
		});

		return () => {
			isActive = false;
			window.removeEventListener('resize', handleResize);
			resizeObserver?.disconnect();
			removeHighlightLayers(article);
		};
	}, [article, blocks, contentKey]);

	return null;
}
