'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import type { InlineCommentSelectionDraft } from '../lib/inline-comment-selection';
import type { InlineCommentSelectionTarget } from '../model/inline-comment-interaction';

import { analytics } from '@/features/analytics/model/events';
import { useMobileDevice } from '@/shared/hooks/use-mobile-device';
import Button from '@/shared/ui/button/Button';

import { createInlineCommentSelectionDraft } from '../lib/inline-comment-selection';

interface InlineCommentSelectionToolbarProps {
	article: HTMLElement;
	postId: number;
	onCreateComment: (selection: InlineCommentSelectionTarget) => void;
}

interface SelectionToolbarState {
	draft: InlineCommentSelectionDraft;
	x: number;
	y: number;
	shouldAlignRight: boolean;
}

const TOOLBAR_OVERLAP = 4;
const EXPANDED_WIDTH = 88;
const VIEWPORT_PADDING = 8;
const DESKTOP_VIEWPORT_QUERY = '(min-width: 768px)';
const subscribeDesktopViewport = (onChange: () => void) => {
	const query = window.matchMedia(DESKTOP_VIEWPORT_QUERY);
	query.addEventListener('change', onChange);
	return () => query.removeEventListener('change', onChange);
};
const getDesktopViewport = () => window.matchMedia(DESKTOP_VIEWPORT_QUERY).matches;
const getServerDesktopViewport = () => false;

export default function InlineCommentSelectionToolbar({
	article,
	postId,
	onCreateComment,
}: InlineCommentSelectionToolbarProps) {
	const { isMobileDevice, isResolved } = useMobileDevice();
	const isDesktopViewport = useSyncExternalStore(
		subscribeDesktopViewport,
		getDesktopViewport,
		getServerDesktopViewport,
	);
	const [toolbar, setToolbar] = useState<SelectionToolbarState | null>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const isEnabled = isResolved && !isMobileDevice && isDesktopViewport;

	useEffect(() => {
		if (!isEnabled) return;
		let isSelecting = false;
		const updateSelection = () => {
			if (isSelecting) return;
			const selection = window.getSelection();
			const draft = selection === null ? null : createInlineCommentSelectionDraft(selection, article);
			if (draft === null && document.activeElement === buttonRef.current) return;
			const rects = Array.from(draft?.range.getClientRects() ?? []).filter((item) => item.width > 0 && item.height > 0);
			const rect = rects?.[rects.length - 1];
			if (!draft || !rect || rect.width === 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
				setToolbar(null);
				return;
			}
			const height = buttonRef.current?.offsetHeight || 28;
			const shouldAlignRight = rect.right - TOOLBAR_OVERLAP + EXPANDED_WIDTH > window.innerWidth - VIEWPORT_PADDING;
			const x = shouldAlignRight
				? Math.min(Math.max(rect.right, EXPANDED_WIDTH + VIEWPORT_PADDING), window.innerWidth - VIEWPORT_PADDING)
				: Math.max(rect.right - TOOLBAR_OVERLAP, VIEWPORT_PADDING);
			const y =
				rect.bottom + height - TOOLBAR_OVERLAP <= window.innerHeight - VIEWPORT_PADDING
					? rect.bottom - TOOLBAR_OVERLAP
					: rect.top - height + TOOLBAR_OVERLAP;
			setToolbar({
				draft,
				x,
				y: Math.min(Math.max(y, VIEWPORT_PADDING), window.innerHeight - height - VIEWPORT_PADDING),
				shouldAlignRight,
			});
		};
		const startSelection = (event: PointerEvent) => {
			if (event.target instanceof Node && buttonRef.current?.contains(event.target)) return;
			isSelecting = true;
			setToolbar(null);
		};
		const finishSelection = (event: PointerEvent) => {
			if (event.target instanceof Node && buttonRef.current?.contains(event.target)) return;
			isSelecting = false;
			updateSelection();
		};
		const dismissOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setToolbar(null);
				window.getSelection()?.removeAllRanges();
			}
		};
		document.addEventListener('selectionchange', updateSelection);
		document.addEventListener('pointerdown', startSelection);
		document.addEventListener('pointerup', finishSelection);
		document.addEventListener('keyup', updateSelection);
		document.addEventListener('keydown', dismissOnEscape);
		window.addEventListener('scroll', updateSelection, true);
		window.addEventListener('resize', updateSelection);
		return () => {
			document.removeEventListener('selectionchange', updateSelection);
			document.removeEventListener('pointerdown', startSelection);
			document.removeEventListener('pointerup', finishSelection);
			document.removeEventListener('keyup', updateSelection);
			document.removeEventListener('keydown', dismissOnEscape);
			window.removeEventListener('scroll', updateSelection, true);
			window.removeEventListener('resize', updateSelection);
		};
	}, [article, isEnabled]);

	if (!isEnabled || toolbar === null) return null;

	return createPortal(
		<div
			role="toolbar"
			aria-label="인라인 댓글"
			className="fixed top-0 left-0 z-50"
			style={{
				transform: `translate3d(${toolbar.x}px, ${toolbar.y}px, 0)${toolbar.shouldAlignRight ? ' translateX(-100%)' : ''}`,
			}}
		>
			<Button
				ref={buttonRef}
				size="icon"
				variant="ghost"
				aria-label="댓글 추가"
				className="group relative h-7! w-7! justify-start! overflow-hidden rounded-full! bg-brand-primary! pl-1.75! text-white! shadow-modal transition-[width]! duration-200 ease-out hover:w-22! focus-visible:w-22! focus-visible:outline-offset-2 motion-reduce:transition-none!"
				onPointerDown={(event) => event.preventDefault()}
				onClick={() => {
					analytics.inlineCommentSelectionReplyClicked({ postId });
					const { blockId, startOffset, endOffset, selectedText } = toolbar.draft;
					onCreateComment({ blockId, startOffset, endOffset, selectedText });
					setToolbar(null);
					window.getSelection()?.removeAllRanges();
				}}
			>
				<svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" className="size-3.5 shrink-0" fill="none">
					<path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
				</svg>
				<span
					aria-hidden="true"
					className="absolute left-7 translate-x-1 text-label-1 whitespace-nowrap opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
				>
					댓글 추가
				</span>
			</Button>
		</div>,
		document.body,
	);
}
