'use client';

import { useEffect, useId, useRef } from 'react';

import type { InlineCommentSelectionTarget, InlineCommentSidebarMode } from '../model/inline-comment-interaction';
import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import type { InlineCommentCreateEntrySource } from '@/features/analytics/model/analytics-event';
import { useAuth } from '@/features/auth/model/use-auth';
import { useLoginModal } from '@/features/login/model/use-login-modal';
import XIcon from '@/shared/assets/icons/x.svg';
import Button from '@/shared/ui/button/Button';
import Divider from '@/shared/ui/divider/Divider';

import InlineCommentComposer from './InlineCommentComposer';
import InlineCommentThread from './InlineCommentThread';

interface PostCommentsFloatingPaneProps {
	open: boolean;
	onCreated?: (commentAnchorId: number) => void;
	isLoading?: boolean;
	isError?: boolean;
	onRetry?: () => void;
	postId: number;
	mode: InlineCommentSidebarMode;
	entrySource?: InlineCommentCreateEntrySource;
	selection?: InlineCommentSelectionTarget | null;
	composerAnchorId?: number | null;
	threads: readonly InlineCommentThreadModel[];
	onClose: () => void;
	onNavigate: (thread: InlineCommentThreadModel) => void;
	className?: string;
}

export default function PostCommentsFloatingPane({
	open,
	onCreated,
	isLoading = false,
	isError = false,
	onRetry,
	postId,
	mode,
	entrySource = 'all',
	threads,
	selection,
	composerAnchorId,
	onClose,
	onNavigate,
	className = '',
}: PostCommentsFloatingPaneProps) {
	const titleId = useId();
	const titleRef = useRef<HTMLHeadingElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const { isAuthenticated, isInitialized } = useAuth();
	const login = useLoginModal();
	const commentCount = threads.reduce((total, thread) => total + thread.anchor.commentCount, 0);
	const hasComposerThread =
		composerAnchorId != null && threads.some(({ anchor }) => anchor.anchorId === composerAnchorId);
	const shouldFocusInput = isAuthenticated && isInitialized && (selection != null || hasComposerThread);

	useEffect(() => {
		if (open && shouldFocusInput) inputRef.current?.focus({ preventScroll: true });
	}, [open, shouldFocusInput, selection, composerAnchorId]);

	if (!open) {
		return null;
	}

	return (
		<div
			role="region"
			aria-labelledby={titleId}
			className={`relative flex h-[calc(100dvh-10rem)] w-full flex-col overflow-hidden rounded-3xl border border-border-default bg-surface shadow-[0_4px_24px_rgba(0,0,0,0.12)] transition-all ${className}`}
		>
			<header className="flex h-15 shrink-0 items-center justify-between border-b border-border-default px-5">
				<h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-title-3 font-semibold text-text-primary">
					{mode === 'all' ? '전체 인라인 댓글' : '인라인 댓글'}{' '}
					<span className="ml-1 text-body-4 font-medium text-text-placeholder">{commentCount}</span>
				</h2>
				<Button variant="ghost" size="icon" aria-label="댓글 사이드바 닫기" onClick={onClose}>
					<XIcon aria-hidden="true" className="size-5" />
				</Button>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
				{selection != null ? (
					<InlineCommentComposer postId={postId} selection={selection} inputRef={inputRef} onCreated={onCreated} />
				) : isLoading ? (
					<p role="status" className="px-5 py-6 text-body-4 text-text-placeholder">
						인라인 댓글을 불러오는 중입니다.
					</p>
				) : isError ? (
					<div className="px-5 py-6">
						<p role="alert" className="mb-3 text-body-4 text-text-secondary">
							인라인 댓글을 불러오지 못했습니다.
						</p>
						<Button variant="ghost" onClick={onRetry}>
							다시 시도
						</Button>
					</div>
				) : threads.length === 0 ? (
					<p className="px-5 py-6 text-body-4 text-text-placeholder">표시할 댓글이 없습니다.</p>
				) : (
					<div>
						{threads.map((thread) => (
							<div key={thread.anchor.anchorId}>
								<InlineCommentThread
									postId={postId}
									thread={thread}
									onNavigate={onNavigate}
									isCollapsible={mode !== 'single'}
									entrySource={entrySource}
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
			{isInitialized && !isAuthenticated && (
				<footer className="shrink-0 bg-surface-hover px-5 pt-5 pb-7 shadow-[0_0_12px_rgba(0,0,0,0.10)]">
					<p className="text-center text-body-4 text-text-secondary">
						<button
							onClick={() => login({ entrySurface: 'sidebar' })}
							className="mr-0.5 font-medium text-focus-ring transition-colors hover:text-focus-ring/80"
						>
							로그인
						</button>
						하고 인라인 댓글에 참여해 보세요.
					</p>
				</footer>
			)}
		</div>
	);
}
