'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { InlineCommentSelectionTarget, InlineCommentSidebarMode } from '../model/inline-comment-interaction';
import type { InlineCommentThreadModel } from '../model/inline-comment-thread';
import type { RefObject } from 'react';

import type { InlineCommentCreateEntrySource } from '@/features/analytics/model/analytics-event';
import { useAuth } from '@/features/auth/model/use-auth';
import { useAuthAction } from '@/features/login/model/use-auth-action';
import NotificationCommentDeletedToast from '@/features/notifications/ui/NotificationCommentDeletedToast';
import XIcon from '@/shared/assets/icons/x.svg';
import Button from '@/shared/ui/button/Button';
import Divider from '@/shared/ui/divider/Divider';

import { COMMENT_PANEL_SESSION_CONTEXT } from '../hooks/use-comment-panel-session';

import InlineCommentComposer from './InlineCommentComposer';
import InlineCommentThread from './InlineCommentThread';

interface PostCommentsPanelContentProps {
	titleId: string;
	titleRef: RefObject<HTMLHeadingElement | null>;
	inputRef: RefObject<HTMLTextAreaElement | null>;
	showDeletedCommentToast?: boolean;
	showCloseButton?: boolean;
	isMobile?: boolean;
	isOpen?: boolean;
	scrollResetKey?: number;
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
}

export default function PostCommentsPanelContent({
	titleId,
	titleRef,
	inputRef,
	showDeletedCommentToast = false,
	showCloseButton = true,
	isMobile = false,
	isOpen = true,
	scrollResetKey = 0,
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
}: PostCommentsPanelContentProps) {
	const { isAuthenticated, isInitialized } = useAuth();
	// A new visibility session prevents old requests from reopening hidden native dialogs.
	const session = useMemo(() => ({ isOpen, scrollResetKey }), [isOpen, scrollResetKey]);
	const listRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!isOpen) return;
		const resetScroll = () => {
			if (listRef.current) listRef.current.scrollTop = 0;
		};
		resetScroll();
		// Native dialog opening/focus can restore a saved scroll after the first reset.
		const frame = window.requestAnimationFrame(resetScroll);
		return () => window.cancelAnimationFrame(frame);
	}, [isOpen, scrollResetKey]);
	const [mobileComposerHost, setMobileComposerHost] = useState<HTMLDivElement | null>(null);
	const [mobileAnchorId, setMobileAnchorId] = useState<number | null>(null);
	const activeThread =
		threads.find(({ anchor }) => anchor.anchorId === mobileAnchorId) ??
		threads.find(({ anchor }) => anchor.anchorId === composerAnchorId) ??
		(threads.length === 1 ? threads[0] : undefined);
	const canShowMobileComposer =
		isMobile &&
		isInitialized &&
		isAuthenticated &&
		(selection != null || (!isLoading && !isError && threads.length > 0));
	const login = useAuthAction({ entrySurface: 'sidebar' });
	const commentCount = threads.reduce((total, thread) => total + thread.anchor.commentCount, 0);

	return (
		<COMMENT_PANEL_SESSION_CONTEXT value={session}>
			{showDeletedCommentToast && <NotificationCommentDeletedToast />}
			<div className="flex h-full min-h-0 flex-col">
				<header
					data-comment-panel-header
					className="flex h-15 shrink-0 touch-none items-center justify-between border-b border-border-default px-5 md:touch-auto"
				>
					<h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-title-3 font-semibold text-text-primary">
						{mode === 'all' ? '전체 인라인 댓글' : '인라인 댓글'}{' '}
						<span className="ml-1 text-body-4 font-medium text-text-placeholder">{commentCount}</span>
					</h2>
					{showCloseButton && (
						<Button variant="ghost" size="icon" aria-label="댓글 사이드바 닫기" onClick={onClose}>
							<XIcon aria-hidden="true" className="size-5" />
						</Button>
					)}
				</header>

				<div ref={listRef} data-comment-list className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
					{selection != null ? (
						<InlineCommentComposer
							postId={postId}
							entrySource={entrySource}
							selection={selection}
							inputRef={inputRef}
							mobileComposerHost={isMobile ? mobileComposerHost : undefined}
							onCreated={onCreated}
						/>
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
										inputRef={
											(
												isMobile
													? activeThread?.anchor.anchorId === thread.anchor.anchorId
													: thread.anchor.anchorId === composerAnchorId
											)
												? inputRef
												: undefined
										}
										mobileComposer={
											isMobile
												? {
														host: mobileComposerHost,
														isActive: activeThread?.anchor.anchorId === thread.anchor.anchorId,
														shouldFocus:
															mobileAnchorId === thread.anchor.anchorId || composerAnchorId === thread.anchor.anchorId,
														onActivate: () => setMobileAnchorId(thread.anchor.anchorId),
													}
												: undefined
										}
									/>
									{mode !== 'single' && (
										<div className="px-5">
											<Divider className="border-border-strong!" />
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
				{canShowMobileComposer && (
					<div
						ref={setMobileComposerHost}
						data-mobile-comment-composer
						role="region"
						aria-label="댓글 작성 입력바"
						className="shrink-0 border-t border-border-default bg-surface px-4 py-3"
					>
						{selection == null && activeThread === undefined && (
							<p className="text-body-4 text-text-secondary">댓글을 남길 인용문을 선택해 주세요.</p>
						)}
					</div>
				)}
				{isInitialized && !isAuthenticated && (
					<footer className="shrink-0 bg-surface-hover px-5 pt-5 pb-7 shadow-[0_0_12px_rgba(0,0,0,0.10)]">
						<p className="text-center text-body-4 text-text-secondary">
							<button
								onClick={login}
								className="mr-0.5 font-medium text-focus-ring transition-colors hover:text-focus-ring/80"
							>
								로그인
							</button>
							하고 인라인 댓글에 참여해 보세요.
						</p>
					</footer>
				)}
			</div>
		</COMMENT_PANEL_SESSION_CONTEXT>
	);
}
