'use client';

import { useCallback, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react';

import type { CSSProperties, MouseEvent, PointerEvent, RefObject } from 'react';

import { revealInlineCommentInput } from '../lib/reveal-inline-comment-input';

import { useCommentViewport } from './use-comment-viewport';

export const COMMENT_SHEET_ENTER_DURATION_MS = 320;
export const COMMENT_SHEET_EXIT_DURATION_MS = 240;

const subscribeViewport = (onChange: () => void) => {
	let frame: number | undefined;
	const followKeyboardViewport = (input: EventTarget | null) => {
		if (!(input instanceof HTMLTextAreaElement) || !input.closest('[data-mobile-comment-composer]')) return;
		if (frame !== undefined) window.cancelAnimationFrame(frame);
		const started = performance.now();
		let lastHeight = window.visualViewport?.height;
		let lastTop = window.visualViewport?.offsetTop;
		const sample = () => {
			if (document.activeElement !== input || performance.now() - started > 1800) return;
			const height = window.visualViewport?.height;
			const top = window.visualViewport?.offsetTop;
			if (height !== lastHeight || top !== lastTop) {
				lastHeight = height;
				lastTop = top;
				onChange();
			}
			frame = window.requestAnimationFrame(sample);
		};
		frame = window.requestAnimationFrame(sample);
	};
	const onFocus = (event: FocusEvent) => followKeyboardViewport(event.target);
	document.addEventListener('focusin', onFocus);
	followKeyboardViewport(document.activeElement);
	window.visualViewport?.addEventListener('resize', onChange);
	window.visualViewport?.addEventListener('scroll', onChange);
	window.addEventListener('resize', onChange);
	return () => {
		document.removeEventListener('focusin', onFocus);
		if (frame !== undefined) window.cancelAnimationFrame(frame);
		window.visualViewport?.removeEventListener('resize', onChange);
		window.visualViewport?.removeEventListener('scroll', onChange);
		window.removeEventListener('resize', onChange);
	};
};
interface ViewportSnapshot {
	height: number;
	top: number;
}
const SERVER_VIEWPORT: ViewportSnapshot = { height: 0, top: 0 };
let viewportSnapshot = SERVER_VIEWPORT;
const getViewportSnapshot = () => {
	const height = window.visualViewport?.height ?? window.innerHeight;
	const top = window.visualViewport?.offsetTop ?? 0;
	if (viewportSnapshot.height !== height || viewportSnapshot.top !== top) viewportSnapshot = { height, top };
	return viewportSnapshot;
};
const getServerViewport = () => SERVER_VIEWPORT;

interface SheetStyle extends CSSProperties {
	'--comment-input-max-height'?: string;
	'--modal-enter-duration'?: string;
	'--modal-exit-duration'?: string;
}

interface SheetState {
	open: boolean;
	isExpanded: boolean;
	dragHeight: number | null;
	dragOffset: number;
}

type GestureSource = 'header' | 'list';
type GestureOwner = 'pending' | 'sheet' | 'scroll';

interface SheetDrag {
	pointerId: number;
	input: 'pointer' | 'touch';
	source: GestureSource;
	owner: GestureOwner;
	startX: number;
	startY: number;
	startHeight: number;
	startOffset: number;
	scrollAtTop: boolean;
	expandedAtStart: boolean;
	captureTarget: HTMLElement | null;
}

interface SelectionStyleSnapshot {
	element: HTMLElement;
	userSelect: string;
}

export function useCommentBottomSheet(
	open: boolean,
	onClose: () => void,
	contentRef: RefObject<HTMLDivElement | null>,
) {
	const isMobile = useCommentViewport('mobile');
	const { height: viewportHeight, top: viewportTop } = useSyncExternalStore(
		subscribeViewport,
		getViewportSnapshot,
		getServerViewport,
	);
	const [sheet, setSheet] = useState<SheetState>({ open, isExpanded: false, dragHeight: null, dragOffset: 0 });
	const drag = useRef<SheetDrag | null>(null);
	const ignoreClick = useRef(false);
	const textSelection = useRef<SelectionStyleSnapshot | null>(null);
	if (sheet.open !== open)
		setSheet({ open, isExpanded: open ? false : sheet.isExpanded, dragHeight: null, dragOffset: 0 });

	useEffect(() => {
		if (!open || !isMobile) {
			drag.current = null;
			ignoreClick.current = false;
			const snapshot = textSelection.current;
			if (snapshot !== null) snapshot.element.style.userSelect = snapshot.userSelect;
			textSelection.current = null;
		}
	}, [isMobile, open]);

	const revealInput = useCallback(() => {
		const active = document.activeElement;
		if (contentRef.current?.contains(active)) revealInlineCommentInput(active);
	}, [contentRef]);
	useEffect(() => {
		if (!open || !isMobile) return;
		const frame = window.requestAnimationFrame(revealInput);
		// Only inputs inside the scrolling list need revealing; the pinned footer follows the viewport.
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(revealInput);
		if (contentRef.current !== null) observer?.observe(contentRef.current);
		return () => {
			window.cancelAnimationFrame(frame);
			observer?.disconnect();
		};
	}, [contentRef, isMobile, open, revealInput, viewportTop, viewportHeight]);

	const height = sheet.dragHeight ?? viewportHeight * (sheet.isExpanded ? 0.95 : 0.7);
	const style: SheetStyle | undefined = isMobile
		? {
				height: height || '70dvh',
				'--modal-enter-duration': `${COMMENT_SHEET_ENTER_DURATION_MS}ms`,
				'--modal-exit-duration': `${COMMENT_SHEET_EXIT_DURATION_MS}ms`,
				translate: open && sheet.dragOffset > 0 ? `0 ${sheet.dragOffset}px` : undefined,
				'--comment-input-max-height': `${Math.max(48, height - 200)}px`,
				maxHeight: viewportHeight * 0.95 || '95dvh',
				// Fixed offsets and visualViewport.offsetTop share the layout viewport origin.
				top: viewportHeight ? viewportTop + viewportHeight - height : '30dvh',
				bottom: 'auto',
				transitionDuration: sheet.dragHeight === null && sheet.dragOffset === 0 ? undefined : '0ms',
			}
		: undefined;

	const restoreTextSelection = () => {
		const snapshot = textSelection.current;
		if (snapshot !== null) snapshot.element.style.userSelect = snapshot.userSelect;
		textSelection.current = null;
	};
	const blockTextSelection = () => {
		const element = contentRef.current;
		if (element !== null && textSelection.current === null) {
			textSelection.current = { element, userSelect: element.style.userSelect };
			element.style.userSelect = 'none';
		}
	};
	const getSource = (target: EventTarget | null): GestureSource | null => {
		const content = contentRef.current;
		if (!open || !isMobile || !(target instanceof Element) || !content?.contains(target)) return null;
		if (target.closest('dialog') !== content.closest('dialog')) return null;
		if (target.closest('[data-comment-sheet-handle]')) return 'header';
		if (
			target.closest(
				'button, a, input, textarea, select, [contenteditable="true"], [data-inline-comment-composer], [data-mobile-comment-composer]',
			)
		)
			return null;
		if (target.closest('[data-comment-panel-header]')) return 'header';
		return target.closest('[data-comment-list]') ? 'list' : null;
	};
	const beginGesture = (
		target: EventTarget | null,
		x: number,
		y: number,
		pointerId: number,
		input: SheetDrag['input'],
	) => {
		const source = getSource(target);
		const content = contentRef.current;
		if (source === null || content === null || drag.current !== null) return;
		const selection = document.getSelection();
		if (
			input === 'touch' &&
			source === 'list' &&
			selection &&
			!selection.isCollapsed &&
			content.contains(selection.anchorNode)
		)
			return;
		const startHeight = content.getBoundingClientRect().height || height;
		const top = content.closest('dialog')?.getBoundingClientRect().top ?? viewportTop + viewportHeight - startHeight;
		const startOffset = Math.max(0, top - (viewportTop + viewportHeight - startHeight));
		const scroller = content.querySelector<HTMLElement>('[data-comment-list]');
		const scrollAtTop = (scroller?.scrollTop ?? 0) <= 1;
		const owner: GestureOwner = source === 'header' ? 'sheet' : sheet.isExpanded && !scrollAtTop ? 'scroll' : 'pending';
		const captureTarget =
			target instanceof Element ? (target.closest<HTMLElement>('[data-comment-sheet-handle]') ?? content) : content;
		drag.current = {
			pointerId,
			input,
			source,
			owner,
			startX: x,
			startY: y,
			startHeight,
			startOffset,
			scrollAtTop,
			expandedAtStart: sheet.isExpanded,
			captureTarget,
		};
		if (owner !== 'scroll') setSheet((previous) => ({ ...previous, dragHeight: startHeight, dragOffset: startOffset }));
		if (owner === 'sheet') {
			blockTextSelection();
			if (input === 'pointer') captureTarget.setPointerCapture?.(pointerId);
		}
	};
	const moveGesture = (x: number, y: number): boolean => {
		const current = drag.current;
		if (current === null || current.owner === 'scroll') return false;
		const dx = x - current.startX;
		const dy = y - current.startY;
		if (current.owner === 'pending') {
			const selection = document.getSelection();
			const selectedText = current.input === 'touch' && selection && !selection.isCollapsed;
			if (!selectedText && Math.max(Math.abs(dx), Math.abs(dy)) < 8) return false;
			const ownsSheet =
				!selectedText &&
				Math.abs(dy) >= Math.abs(dx) &&
				((!current.expandedAtStart && dy < 0) || (current.scrollAtTop && dy > 0));
			current.owner = ownsSheet ? 'sheet' : 'scroll';
			if (!ownsSheet) {
				setSheet((previous) => ({ ...previous, dragHeight: null, dragOffset: 0 }));
				return false;
			}
			blockTextSelection();
			if (current.input === 'pointer') current.captureTarget?.setPointerCapture?.(current.pointerId);
		}
		if (Math.max(Math.abs(dx), Math.abs(dy)) > 8) ignoreClick.current = true;
		const delta = -dy;
		setSheet((previous) => ({
			...previous,
			dragHeight: Math.min(
				viewportHeight * 0.95,
				Math.max(viewportHeight * 0.7, current.startHeight + delta - current.startOffset),
			),
			dragOffset: Math.max(0, viewportHeight * 0.7 - current.startHeight - delta + current.startOffset),
		}));
		return true;
	};
	const endGesture = (y: number, canceled = false) => {
		const current = drag.current;
		if (current === null) return;
		drag.current = null;
		restoreTextSelection();
		if (current.input === 'pointer' && current.captureTarget?.hasPointerCapture?.(current.pointerId))
			current.captureTarget.releasePointerCapture(current.pointerId);
		const delta = y - current.startY;
		const isSheetDrag = current.owner === 'sheet' && !canceled;
		const offset = Math.max(0, delta + current.startOffset - (current.startHeight - viewportHeight * 0.7));
		if (isSheetDrag && delta > 64 && offset > 64) onClose();
		if (canceled) ignoreClick.current = true;
		setSheet((previous) => ({
			...previous,
			dragHeight: null,
			dragOffset: 0,
			isExpanded: isSheetDrag ? (delta < -64 ? true : delta > 64 ? false : previous.isExpanded) : previous.isExpanded,
		}));
	};
	const onPointerDown = (event: PointerEvent<HTMLElement>) => {
		if (!open || event.button !== 0 || !event.isPrimary) return;
		ignoreClick.current = false;
		const source = getSource(event.target);
		if (source === 'header') event.preventDefault();
		// Touchmove ownership is chosen before native vertical panning; scroll gestures stay native.
		if (event.pointerType === 'touch') return;
		beginGesture(event.target, event.clientX, event.clientY, event.pointerId, 'pointer');
	};
	const onPointerMove = (event: PointerEvent<HTMLElement>) => {
		if (
			event.pointerType === 'touch' ||
			drag.current?.input !== 'pointer' ||
			drag.current.pointerId !== event.pointerId
		)
			return;
		if (moveGesture(event.clientX, event.clientY)) event.preventDefault();
	};
	const onPointerUp = (event: PointerEvent<HTMLElement>) => {
		if (
			event.pointerType !== 'touch' &&
			drag.current?.input === 'pointer' &&
			drag.current.pointerId === event.pointerId
		)
			endGesture(event.clientY);
	};
	const onPointerCancel = (event: PointerEvent<HTMLElement>) => {
		if (event.pointerType !== 'touch' && drag.current?.input === 'pointer') endGesture(event.clientY, true);
	};
	const onTouchStart = useEffectEvent((event: TouchEvent) => {
		ignoreClick.current = false;
		if (event.touches.length !== 1) {
			endGesture(drag.current?.startY ?? 0, true);
			return;
		}
		const touch = event.touches[0];
		beginGesture(event.target, touch.clientX, touch.clientY, touch.identifier, 'touch');
	});
	const onTouchMove = useEffectEvent((event: TouchEvent) => {
		if (drag.current?.input !== 'touch') return;
		if (event.touches.length !== 1) {
			endGesture(drag.current.startY, true);
			return;
		}
		if (!event.cancelable && drag.current.owner === 'pending') {
			drag.current.owner = 'scroll';
			setSheet((previous) => ({ ...previous, dragHeight: null, dragOffset: 0 }));
			return;
		}
		const touch = event.touches[0];
		if (moveGesture(touch.clientX, touch.clientY) && event.cancelable) event.preventDefault();
	});
	const onTouchEnd = useEffectEvent((event: TouchEvent) => {
		if (drag.current?.input !== 'touch') return;
		const current = drag.current;
		const touch = Array.from(event.changedTouches).find((item) => item.identifier === current.pointerId);
		if (touch) endGesture(touch.clientY);
	});
	const onTouchCancel = useEffectEvent(() => endGesture(drag.current?.startY ?? 0, true));
	useEffect(() => {
		if (!open || !isMobile || contentRef.current === null) return;
		const content = contentRef.current;
		content.addEventListener('touchstart', onTouchStart, { passive: true });
		content.addEventListener('touchmove', onTouchMove, { passive: false });
		content.addEventListener('touchend', onTouchEnd);
		content.addEventListener('touchcancel', onTouchCancel);
		return () => {
			content.removeEventListener('touchstart', onTouchStart);
			content.removeEventListener('touchmove', onTouchMove);
			content.removeEventListener('touchend', onTouchEnd);
			content.removeEventListener('touchcancel', onTouchCancel);
			drag.current = null;
			const snapshot = textSelection.current;
			if (snapshot !== null) snapshot.element.style.userSelect = snapshot.userSelect;
			textSelection.current = null;
		};
	}, [contentRef, isMobile, open]);

	return {
		isMobile,
		style,
		isExpanded: sheet.isExpanded,
		revealInput,
		gestureProps: {
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerCancel,
			onClickCapture: (event: MouseEvent<HTMLElement>) => {
				if (!open || ignoreClick.current) {
					ignoreClick.current = false;
					event.preventDefault();
					event.stopPropagation();
				}
			},
			onKeyDownCapture: () => {
				ignoreClick.current = false;
			},
		},
		handleProps: {
			onClick: () => {
				if (!open) return;
				if (ignoreClick.current) {
					ignoreClick.current = false;
					return;
				}
				setSheet((previous) => ({ ...previous, isExpanded: !previous.isExpanded }));
			},
		},
	};
}
