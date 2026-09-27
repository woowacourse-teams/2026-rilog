'use client';

import { useId, useRef } from 'react';

import type { InlineCommentSelectionTarget, InlineCommentSidebarMode } from '../model/inline-comment-interaction';
import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import { useAuth } from '@/features/auth/model/use-auth';
import XIcon from '@/shared/assets/icons/x.svg';
import Button from '@/shared/ui/button/Button';
import Divider from '@/shared/ui/divider/Divider';
import BaseModal from '@/shared/ui/modal/BaseModal';

import InlineCommentComposer from './InlineCommentComposer';
import InlineCommentThread from './InlineCommentThread';

interface PostCommentsSidebarProps {
	open: boolean;
	postId: number;
	mode: InlineCommentSidebarMode;
	selection?: InlineCommentSelectionTarget | null;
	composerAnchorId?: number | null;
	threads: readonly InlineCommentThreadModel[];
	onClose: () => void;
	onNavigate: (thread: InlineCommentThreadModel) => void;
}

export default function PostCommentsSidebar({
	open,
	postId,
	mode,
	threads,
	selection,
	composerAnchorId,
	onClose,
	onNavigate,
}: PostCommentsSidebarProps) {
	const titleId = useId();
	const titleRef = useRef<HTMLHeadingElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const { isAuthenticated, isInitialized } = useAuth();
	const shouldFocusInput = isAuthenticated && isInitialized && (selection != null || composerAnchorId != null);
	const commentCount = threads.reduce((total, thread) => total + thread.anchor.comments.length, 0);

	return (
		<BaseModal
			open={open}
			onDismiss={onClose}
			accessibility={{ labelledBy: titleId }}
			initialFocusRef={shouldFocusInput ? inputRef : titleRef}
			className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none translate-x-full overflow-hidden border-l border-border-default shadow-modal transition-[transform,overlay,display] [transition-behavior:allow-discrete] duration-(--modal-exit-duration) ease-out data-[state=open]:translate-x-0 data-[state=open]:duration-(--modal-enter-duration) motion-reduce:transition-none sm:w-112"
		>
			<div className="flex h-full min-h-0 flex-col">
				<header className="flex h-15 shrink-0 items-center justify-between border-b border-border-default px-5">
					<h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-title-1 font-semibold text-text-primary">
						{mode === 'all' ? '전체 인라인 댓글' : '인라인 댓글'}{' '}
						<span className="ml-1 text-body-1 font-medium text-text-placeholder">{commentCount}</span>
					</h2>
					<Button variant="ghost" size="icon" aria-label="댓글 사이드바 닫기" onClick={onClose}>
						<XIcon aria-hidden="true" className="size-5" />
					</Button>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
					{selection != null ? (
						<InlineCommentComposer postId={postId} selection={selection} inputRef={inputRef} />
					) : threads.length === 0 ? (
						<p className="px-5 py-6 text-body-1 text-text-placeholder">표시할 댓글이 없습니다.</p>
					) : (
						<div>
							{threads.map((thread) => (
								<div key={thread.anchor.anchorId}>
									<InlineCommentThread
										thread={thread}
										onNavigate={onNavigate}
										isCollapsible={mode !== 'single'}
										inputRef={thread.anchor.anchorId === composerAnchorId ? inputRef : undefined}
									/>
									{mode !== 'single' && (
										<div className="px-5">
											<Divider />
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</BaseModal>
	);
}
