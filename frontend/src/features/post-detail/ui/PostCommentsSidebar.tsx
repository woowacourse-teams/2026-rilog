'use client';

import { useId, useRef } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import BaseModal from '@/shared/ui/modal/BaseModal';

import { COMMENT_SHEET_EXIT_DURATION_MS, useCommentBottomSheet } from '../hooks/use-comment-bottom-sheet';

import PostCommentsPanelContent from './PostCommentsPanelContent';

interface PostCommentsSidebarProps extends Omit<
	Parameters<typeof PostCommentsPanelContent>[0],
	'titleId' | 'titleRef' | 'inputRef' | 'showCloseButton' | 'isMobile' | 'isOpen'
> {
	open: boolean;
	onClosed?: () => void;
}

export default function PostCommentsSidebar({ open, onClosed, ...contentProps }: PostCommentsSidebarProps) {
	const titleId = useId();
	const titleRef = useRef<HTMLHeadingElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const sheet = useCommentBottomSheet(open, contentProps.onClose, contentRef);
	const { isAuthenticated, isInitialized } = useAuth();
	const shouldFocusInput =
		isAuthenticated && isInitialized && (contentProps.selection != null || contentProps.composerAnchorId != null);

	return (
		<BaseModal
			open={open}
			historyManaged
			onDismiss={contentProps.onClose}
			onClosed={onClosed}
			accessibility={{ labelledBy: titleId }}
			initialFocusRef={shouldFocusInput ? inputRef : titleRef}
			style={sheet.style}
			exitDurationMs={sheet.isMobile ? COMMENT_SHEET_EXIT_DURATION_MS : undefined}
			className={
				sheet.isMobile
					? `fixed inset-x-0 top-auto m-0 w-full max-w-none translate-y-full overflow-hidden rounded-t-modal shadow-modal transition-[translate,top,height,overlay,display] [transition-behavior:allow-discrete] duration-(--modal-exit-duration) ease-[cubic-bezier(0.32,0.72,0,1)] has-[textarea:focus]:transition-[translate,overlay,display] data-[state=closing]:ease-[cubic-bezier(0.4,0,1,1)] data-[state=open]:translate-y-0 data-[state=open]:duration-(--modal-enter-duration) motion-reduce:transition-none ${shouldFocusInput ? 'data-[state=opening]:translate-y-0 data-[state=opening]:transition-none' : ''}`
					: 'fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none translate-x-full overflow-hidden border-l border-border-default transition-[transform,overlay,display] [transition-behavior:allow-discrete] duration-(--modal-exit-duration) ease-out data-[state=open]:translate-x-0 data-[state=open]:duration-(--modal-enter-duration) motion-reduce:transition-none md:w-112'
			}
		>
			<div
				ref={contentRef}
				{...(sheet.isMobile ? sheet.gestureProps : {})}
				data-comment-bottom-sheet={sheet.isMobile ? '' : undefined}
				className="flex h-full min-h-0 flex-col pb-[env(safe-area-inset-bottom)] max-md:has-[textarea:focus]:pb-0"
				onFocusCapture={sheet.isMobile ? sheet.revealInput : undefined}
			>
				{sheet.isMobile && (
					<button
						type="button"
						data-comment-sheet-handle
						aria-label={sheet.isExpanded ? '댓글창 축소' : '댓글창 확장'}
						aria-expanded={sheet.isExpanded}
						className="flex h-8 w-full shrink-0 touch-none items-center justify-center rounded-t-modal focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
						{...sheet.handleProps}
					>
						<span aria-hidden="true" className="h-1 w-10 rounded-full bg-border-strong" />
					</button>
				)}
				<div className="min-h-0 flex-1">
					<PostCommentsPanelContent
						{...contentProps}
						isOpen={open}
						showCloseButton={!sheet.isMobile}
						isMobile={sheet.isMobile}
						titleId={titleId}
						titleRef={titleRef}
						inputRef={inputRef}
					/>
				</div>
			</div>
		</BaseModal>
	);
}
