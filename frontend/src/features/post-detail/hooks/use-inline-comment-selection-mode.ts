'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import type { InlineCommentSelectionDraft } from '../lib/inline-comment-selection';
import type { RefObject } from 'react';

import { getInlineCommentOffsetAtPoint } from '../lib/inline-comment-interaction';
import { restoreInlineCommentRange } from '../lib/inline-comment-range';
import { createInlineCommentSelectionDraft } from '../lib/inline-comment-selection';

const ROOT_SELECTOR = '[data-inline-comment-root][data-inline-comment-block-id]';

interface SelectionModeState {
	draft: InlineCommentSelectionDraft;
	focusRect: DOMRect;
	viewportTop: number;
	viewportBottom: number;
}

interface PointerSelection {
	pointerId: number;
	root: HTMLElement;
	startOffset: number;
}

const getVisibleOffset = (root: HTMLElement, x: number, y: number, viewportTop: number, viewportBottom: number) => {
	const rect = root.getBoundingClientRect();
	const left = Math.max(0, rect.left);
	const right = Math.min(window.innerWidth, rect.right);
	const top = Math.max(viewportTop, rect.top);
	const bottom = Math.min(viewportBottom, rect.bottom);
	if (right <= left || bottom <= top) return null;
	return getInlineCommentOffsetAtPoint(
		root,
		Math.max(left + 1, Math.min(x, right - 1)),
		Math.max(top + 1, Math.min(y, bottom - 1)),
	);
};

export function useInlineCommentSelectionMode(
	article: HTMLElement,
	isActive: boolean,
	onCancel: () => void,
	statusBarRef: RefObject<HTMLElement | null>,
) {
	const [selected, setSelected] = useState<SelectionModeState | null>(null);
	const cancel = useEffectEvent(onCancel);

	useEffect(() => {
		if (!isActive) return;
		const document = window.document;
		const html = document.documentElement;
		const scrollX = window.scrollX;
		const scrollY = window.scrollY;
		const original = {
			overflow: html.style.overflow,
			overflowX: html.style.overflowX,
			overflowY: html.style.overflowY,
			scrollbarGutter: html.style.scrollbarGutter,
			touchAction: article.style.touchAction,
		};
		// Keep the document in normal flow and preserve classic scrollbar space.
		if (window.innerWidth > html.clientWidth) html.style.scrollbarGutter = 'stable';
		html.style.overflow = 'hidden';
		article.style.setProperty('touch-action', 'none');
		let pointer: PointerSelection | null = null;
		document.getSelection()?.removeAllRanges();

		const getViewportBounds = () => {
			const notice = statusBarRef.current?.getBoundingClientRect();
			return {
				top: Math.max(
					0,
					document.querySelector<HTMLElement>('[data-mobile-header]')?.getBoundingClientRect().bottom ?? 0,
				),
				bottom: notice && notice.height > 0 ? Math.min(window.innerHeight, notice.top - 8) : window.innerHeight,
			};
		};

		const updateDraft = () => {
			if (pointer !== null) return;
			const selection = document.getSelection();
			const next = selection === null ? null : createInlineCommentSelectionDraft(selection, article);
			// Keyboard selection must obey the same visible-viewport boundary as pointer selection.
			const rects = next === null ? [] : Array.from(next.range.getClientRects());
			const bounds = getViewportBounds();
			const isVisible =
				rects.length > 0 && rects.every((rect) => rect.top >= bounds.top && rect.bottom <= bounds.bottom);
			if (!isVisible || next === null || selection === null) {
				setSelected(null);
				return;
			}
			const isBackward =
				selection.focusNode === next.range.startContainer && selection.focusOffset === next.range.startOffset;
			const caret = next.range.cloneRange();
			caret.collapse(isBackward);
			const focusRect =
				Array.from(caret.getClientRects()).find((rect) => rect.height > 0) ?? rects[isBackward ? 0 : rects.length - 1];
			setSelected({ draft: next, focusRect, viewportTop: bounds.top, viewportBottom: bounds.bottom });
		};
		updateDraft();
		const updatePointer = (event: PointerEvent) => {
			if (pointer === null || event.pointerId !== pointer.pointerId) return;
			event.preventDefault();
			const bounds = getViewportBounds();
			const offset = getVisibleOffset(pointer.root, event.clientX, event.clientY, bounds.top, bounds.bottom);
			if (offset === null) return;
			const selection = document.getSelection();
			const range = restoreInlineCommentRange(pointer.root, {
				startOffset: Math.min(pointer.startOffset, offset),
				endOffset: Math.max(pointer.startOffset, offset),
			});
			selection?.removeAllRanges();
			if (range !== null && selection !== null) {
				if (offset < pointer.startOffset && typeof selection.setBaseAndExtent === 'function') {
					selection.setBaseAndExtent(range.endContainer, range.endOffset, range.startContainer, range.startOffset);
				} else selection.addRange(range);
			}
		};
		const startPointer = (event: PointerEvent) => {
			if (event.button !== 0 || pointer !== null || !(event.target instanceof Element)) return;
			const root = event.target.closest<HTMLElement>(ROOT_SELECTOR);
			event.preventDefault();
			document.getSelection()?.removeAllRanges();
			setSelected(null);
			if (root === null || !article.contains(root) || root.closest('[data-content-type="codeBlock"]') !== null) return;
			const bounds = getViewportBounds();
			const startOffset = getVisibleOffset(root, event.clientX, event.clientY, bounds.top, bounds.bottom);
			if (startOffset === null) return;
			pointer = { pointerId: event.pointerId, root, startOffset };
			article.setPointerCapture?.(event.pointerId);
		};
		const finishPointer = (event: PointerEvent) => {
			if (pointer?.pointerId !== event.pointerId) return;
			updatePointer(event);
			pointer = null;
			updateDraft();
			if (article.hasPointerCapture?.(event.pointerId)) article.releasePointerCapture(event.pointerId);
		};
		const cancelPointer = () => {
			pointer = null;
			document.getSelection()?.removeAllRanges();
			setSelected(null);
		};
		const preventInteraction = (event: Event) => {
			event.preventDefault();
			event.stopPropagation();
		};
		const preventScroll = (event: Event) => event.preventDefault();
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				cancel();
			} else if (!event.shiftKey && ['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
				event.preventDefault();
			}
		};
		article.addEventListener('pointerdown', startPointer);
		article.addEventListener('click', preventInteraction, true);
		article.addEventListener('contextmenu', preventInteraction);
		document.addEventListener('pointermove', updatePointer, { passive: false });
		document.addEventListener('pointerup', finishPointer);
		document.addEventListener('pointercancel', cancelPointer);
		document.addEventListener('selectionchange', updateDraft);
		document.addEventListener('keydown', handleKeyDown);
		document.addEventListener('wheel', preventScroll, { passive: false });
		document.addEventListener('touchmove', preventScroll, { passive: false });
		window.addEventListener('resize', cancel);
		return () => {
			article.removeEventListener('pointerdown', startPointer);
			article.removeEventListener('click', preventInteraction, true);
			article.removeEventListener('contextmenu', preventInteraction);
			document.removeEventListener('pointermove', updatePointer);
			document.removeEventListener('pointerup', finishPointer);
			document.removeEventListener('pointercancel', cancelPointer);
			document.removeEventListener('selectionchange', updateDraft);
			document.removeEventListener('keydown', handleKeyDown);
			document.removeEventListener('wheel', preventScroll);
			document.removeEventListener('touchmove', preventScroll);
			window.removeEventListener('resize', cancel);
			html.style.overflow = original.overflow;
			if (original.overflowX) html.style.overflowX = original.overflowX;
			if (original.overflowY) html.style.overflowY = original.overflowY;
			html.style.scrollbarGutter = original.scrollbarGutter;
			article.style.setProperty('touch-action', original.touchAction);
			const scrollBehavior = html.style.scrollBehavior;
			html.style.scrollBehavior = 'auto';
			window.scrollTo(scrollX, scrollY);
			html.style.scrollBehavior = scrollBehavior;
			document.getSelection()?.removeAllRanges();
		};
	}, [article, isActive, statusBarRef]);

	return isActive ? selected : null;
}
