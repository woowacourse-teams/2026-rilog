'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { InlineCommentSelectionDraft } from '../lib/inline-comment-selection';
import type { InlineCommentSelectionTarget } from '../model/inline-comment-interaction';

import { analytics } from '@/features/analytics/model/events';
import { useAuth } from '@/features/auth/model/use-auth';

import { useCommentViewport } from '../hooks/use-comment-viewport';
import { createInlineCommentSelectionDraft } from '../lib/inline-comment-selection';

import InlineCommentSelectionAction from './InlineCommentSelectionAction';

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
export default function InlineCommentSelectionToolbar({
	article,
	postId,
	onCreateComment,
}: InlineCommentSelectionToolbarProps) {
	const { isInitialized } = useAuth();
	const isDesktopViewport = useCommentViewport('desktop');
	const [toolbar, setToolbar] = useState<SelectionToolbarState | null>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const isEnabled = isInitialized;

	useEffect(() => {
		if (!isEnabled) return;
		let isSelecting = false;
		let isActivating = false;
		let releaseFrame: number | undefined;
		const updateSelection = () => {
			if (isSelecting || isActivating) return;
			const selection = window.getSelection();
			const draft = selection === null ? null : createInlineCommentSelectionDraft(selection, article);
			if (draft === null && document.activeElement === buttonRef.current) return;
			const rects = Array.from(draft?.range.getClientRects() ?? []).filter((item) => item.width > 0 && item.height > 0);
			const rect = rects?.[rects.length - 1];
			if (!draft || !rect || rect.width === 0 || rect.bottom < 0 || rect.top > window.innerHeight) {
				setToolbar(null);
				return;
			}
			const viewport = window.visualViewport;
			const viewportTop = viewport?.offsetTop ?? 0;
			const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
			const viewportLeft = viewport?.offsetLeft ?? 0;
			const viewportRight = viewportLeft + (viewport?.width ?? window.innerWidth);
			const height = buttonRef.current?.offsetHeight || (isDesktopViewport ? 28 : 44);
			const width = isDesktopViewport ? EXPANDED_WIDTH : 112;
			const shouldAlignRight =
				isDesktopViewport && rect.right - TOOLBAR_OVERLAP + width > viewportRight - VIEWPORT_PADDING;
			let x = shouldAlignRight
				? Math.min(Math.max(rect.right, width + VIEWPORT_PADDING), viewportRight - VIEWPORT_PADDING)
				: Math.max(rect.right - TOOLBAR_OVERLAP, viewportLeft + VIEWPORT_PADDING);
			let y = rect.bottom - TOOLBAR_OVERLAP;
			if (!isDesktopViewport) {
				x = Math.min(
					Math.max(rect.right - TOOLBAR_OVERLAP, viewportLeft + VIEWPORT_PADDING),
					viewportRight - width - VIEWPORT_PADDING,
				);
				y = rect.bottom + 16;
				if (y + height > viewportBottom - VIEWPORT_PADDING) y = rect.top - height - 16;
			} else if (y + height > viewportBottom - VIEWPORT_PADDING) y = rect.top - height + TOOLBAR_OVERLAP;

			setToolbar({
				draft,
				x,
				y: Math.min(Math.max(y, viewportTop + VIEWPORT_PADDING), viewportBottom - height - VIEWPORT_PADDING),
				shouldAlignRight,
			});
		};
		const startSelection = (event: PointerEvent) => {
			if (event.target instanceof Node && buttonRef.current?.contains(event.target)) {
				isActivating = true;
				return;
			}
			if (!isDesktopViewport) return;
			isSelecting = true;
			setToolbar(null);
		};
		const finishSelection = () => {
			if (isActivating) {
				releaseFrame = window.requestAnimationFrame(() => {
					isActivating = false;
					updateSelection();
				});
				return;
			}
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
		document.addEventListener('pointercancel', finishSelection);
		document.addEventListener('keyup', updateSelection);
		document.addEventListener('keydown', dismissOnEscape);
		window.addEventListener('scroll', updateSelection, true);
		window.addEventListener('resize', updateSelection);
		window.visualViewport?.addEventListener('resize', updateSelection);
		window.visualViewport?.addEventListener('scroll', updateSelection);
		updateSelection();
		return () => {
			document.removeEventListener('selectionchange', updateSelection);
			document.removeEventListener('pointerdown', startSelection);
			document.removeEventListener('pointerup', finishSelection);
			document.removeEventListener('pointercancel', finishSelection);
			if (releaseFrame !== undefined) window.cancelAnimationFrame(releaseFrame);
			document.removeEventListener('keyup', updateSelection);
			document.removeEventListener('keydown', dismissOnEscape);
			window.removeEventListener('scroll', updateSelection, true);
			window.removeEventListener('resize', updateSelection);
			window.visualViewport?.removeEventListener('resize', updateSelection);
			window.visualViewport?.removeEventListener('scroll', updateSelection);
		};
	}, [article, isEnabled, isDesktopViewport]);

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
			<InlineCommentSelectionAction
				buttonRef={buttonRef}
				expanded={!isDesktopViewport}
				onClick={() => {
					analytics.inlineCommentSelectionReplyClicked({ postId });
					const { blockId, startOffset, endOffset, selectedText } = toolbar.draft;
					onCreateComment({ blockId, startOffset, endOffset, selectedText });
					setToolbar(null);
					window.getSelection()?.removeAllRanges();
				}}
			/>
		</div>,
		document.body,
	);
}
