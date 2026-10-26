'use client';

import { useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import type { InlineCommentSelectionTarget } from '../model/inline-comment-interaction';

import CommentIcon from '@/shared/assets/icons/comment.svg';
import Button from '@/shared/ui/button/Button';

import { useInlineCommentSelectionMode } from '../hooks/use-inline-comment-selection-mode';

import InlineCommentSelectionAction from './InlineCommentSelectionAction';

interface InlineCommentFloatingSelectionProps {
	article: HTMLElement;
	isActive: boolean;
	onActiveChange: (active: boolean) => void;
	onCreateComment: (selection: InlineCommentSelectionTarget) => void;
}

const ACTION_WIDTH = 112;
const ACTION_HEIGHT = 44;
const ACTION_GAP = 12;
const VIEWPORT_PADDING = 8;

const subscribeDesktop = (onChange: () => void) => {
	const query = window.matchMedia?.('(min-width: 768px)');
	query?.addEventListener('change', onChange);
	return () => query?.removeEventListener('change', onChange);
};
const getDesktop = () => window.matchMedia?.('(min-width: 768px)').matches ?? false;
const getServerDesktop = () => false;

export default function InlineCommentFloatingSelection({
	article,
	isActive,
	onActiveChange,
	onCreateComment,
}: InlineCommentFloatingSelectionProps) {
	const isDesktop = useSyncExternalStore(subscribeDesktop, getDesktop, getServerDesktop);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const statusBarRef = useRef<HTMLDivElement>(null);
	const cancel = () => {
		onActiveChange(false);
		window.requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));
	};
	const selected = useInlineCommentSelectionMode(article, isActive && isDesktop, cancel, statusBarRef);
	const position =
		selected === null
			? null
			: {
					left: Math.max(
						VIEWPORT_PADDING,
						Math.min(selected.focusRect.left, window.innerWidth - ACTION_WIDTH - VIEWPORT_PADDING),
					),
					top: Math.max(
						selected.viewportTop + VIEWPORT_PADDING,
						Math.min(
							selected.focusRect.bottom + ACTION_GAP + ACTION_HEIGHT <= selected.viewportBottom - VIEWPORT_PADDING
								? selected.focusRect.bottom + ACTION_GAP
								: selected.focusRect.top - ACTION_HEIGHT - ACTION_GAP,
							selected.viewportBottom - ACTION_HEIGHT - VIEWPORT_PADDING,
						),
					),
				};

	if (!isDesktop) return null;
	return createPortal(
		<>
			{isActive && (
				<div
					ref={statusBarRef}
					role="region"
					aria-label="댓글 선택 모드"
					className="pointer-events-none fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-50 flex justify-center sm:left-19"
				>
					<div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-border-strong bg-surface px-4 py-3 text-text-primary shadow-md">
						<p role="status" className="text-body-4 font-medium">
							댓글을 남길 부분을 드래그하세요
						</p>
						<Button
							variant="ghost"
							size="sm"
							className="shrink-0 rounded-lg! px-2!"
							aria-label="선택 취소"
							onClick={cancel}
						>
							취소
						</Button>
					</div>
				</div>
			)}
			{!isActive && (
				<div className="fixed right-5 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40">
					<Button
						ref={buttonRef}
						size="md"
						className="h-12! rounded-full! px-5! shadow-sm"
						onClick={() => onActiveChange(true)}
					>
						<span aria-hidden="true" className="relative size-5 shrink-0">
							<CommentIcon className="size-5" focusable="false" />
							<svg viewBox="0 0 24 24" fill="none" className="absolute inset-0 size-5" focusable="false">
								<path d="M12 7v8M8 11h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
							</svg>
						</span>
						댓글 작성
					</Button>
				</div>
			)}
			{selected !== null && position !== null && (
				<div className="fixed z-50" style={position}>
					<InlineCommentSelectionAction
						expanded
						label="댓글 쓰기"
						onClick={() => {
							const { blockId, startOffset, endOffset, selectedText } = selected.draft;
							onCreateComment({ blockId, startOffset, endOffset, selectedText });
						}}
					/>
				</div>
			)}
		</>,
		document.body,
	);
}
