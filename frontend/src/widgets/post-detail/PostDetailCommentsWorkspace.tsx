'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { ReactNode } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import type { PostCategory } from '@/domains/post/model/post';
import type { InlineCommentCreateEntrySource } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import { useAuth } from '@/features/auth/model/use-auth';
import { useCommentViewport } from '@/features/post-detail/hooks/use-comment-viewport';
import { useInlineCommentAuthAction } from '@/features/post-detail/hooks/use-inline-comment-auth-action';
import { usePostInlineComments } from '@/features/post-detail/hooks/use-post-inline-comments';
import { usePostInlineCommentsSidebar } from '@/features/post-detail/hooks/use-post-inline-comments-sidebar';
import { navigateInlineCommentAnchor } from '@/features/post-detail/lib/navigate-inline-comment-anchor';
import type { InlineCommentBlockModel } from '@/features/post-detail/model/inline-comment';
import type {
	InlineCommentOpenRequest,
	InlineCommentSelectionTarget,
	InlineCommentSidebarMode,
} from '@/features/post-detail/model/inline-comment-interaction';
import type { InlineCommentThreadModel } from '@/features/post-detail/model/inline-comment-thread';
import PostAllCommentsButton from '@/features/post-detail/ui/PostAllCommentsButton';
import PostCommentsDockedCard from '@/features/post-detail/ui/PostCommentsDockedCard';
import PostCommentsSidebar from '@/features/post-detail/ui/PostCommentsSidebar';
import PostDetailContent from '@/features/post-detail/ui/PostDetailContent';
import CommentIcon from '@/shared/assets/icons/comment.svg';
import Button from '@/shared/ui/button/Button';
import Divider from '@/shared/ui/divider/Divider';

import styles from './PostDetail.module.css';
import { useCommentHistory } from './use-comment-history';
import { useDockedCommentsHost } from './use-docked-comments-host';

interface PostDetailCommentsWorkspaceProps {
	html: string;
	postId: number;
	initialSelectionId?: number | null;
	showDeletedCommentToast?: boolean;
	ownerType: BlogType;
	category: PostCategory;
	enableInlineCommentSelectionDebug: boolean;
	profileSection: ReactNode;
	afterProfile?: ReactNode;
}

const EMPTY_INLINE_COMMENT_BLOCKS: InlineCommentBlockModel[] = [];
const EMPTY_INLINE_COMMENT_THREADS: InlineCommentThreadModel[] = [];

const findAnchorElement = (anchorId: number) =>
	Array.from(document.querySelectorAll<HTMLElement>('[data-inline-comment-anchor-id]')).find(
		(element) => element.dataset.inlineCommentAnchorId === String(anchorId),
	);

const scrollToThreadAnchor = (thread: InlineCommentThreadModel) => {
	const target =
		findAnchorElement(thread.anchor.anchorId) ??
		document.querySelector<HTMLElement>(`[data-inline-comment-block-id="${thread.blockId}"]`);
	target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

export default function PostDetailCommentsWorkspace({
	html,
	postId,
	initialSelectionId = null,
	showDeletedCommentToast = false,
	ownerType,
	category,
	enableInlineCommentSelectionDebug,
	profileSection,
	afterProfile,
}: PostDetailCommentsWorkspaceProps) {
	const isMobileViewport = useCommentViewport('mobile');
	const dockHost = useDockedCommentsHost(postId);
	const isDocked = dockHost !== null && dockHost !== undefined;
	const isLayoutReady = dockHost !== undefined;
	const { isAuthenticated } = useAuth();
	const {
		view,
		open: openCommentView,
		close: closeCommentView,
	} = useCommentHistory(postId, initialSelectionId !== null);
	const isCommentsSidebarOpen = view === 'comments';
	const openerRef = useRef<HTMLElement | null>(null);
	const pendingNavigation = useRef<InlineCommentThreadModel | null>(null);
	const navigationCleanup = useRef<(() => void) | null>(null);
	const cancelAnchorNavigation = useCallback(() => {
		pendingNavigation.current = null;
		navigationCleanup.current?.();
		navigationCleanup.current = null;
	}, []);
	useEffect(() => cancelAnchorNavigation, [cancelAnchorNavigation]);
	useLayoutEffect(() => {
		if (isCommentsSidebarOpen) cancelAnchorNavigation();
	}, [isCommentsSidebarOpen, cancelAnchorNavigation]);
	const navigateToThread = useCallback((thread: InlineCommentThreadModel) => {
		navigationCleanup.current?.();
		const getHighlights = () =>
			Array.from(
				document.querySelectorAll<HTMLElement>(
					`[data-inline-comment-highlight][data-inline-comment-anchor-id="${thread.anchor.anchorId}"]`,
				),
			);
		const target =
			document.querySelector<HTMLElement>(`[data-inline-comment-block-id="${thread.blockId}"]`) ?? getHighlights()[0];
		if (target) navigationCleanup.current = navigateInlineCommentAnchor(target, getHighlights);
	}, []);
	const handleCommentsClosed = useCallback(() => {
		const thread = pendingNavigation.current;
		pendingNavigation.current = null;
		if (thread) navigateToThread(thread);
	}, [navigateToThread]);
	const commentsQuery = usePostInlineComments(postId);
	const sidebarQuery = usePostInlineCommentsSidebar(postId);
	const sidebarThreads = sidebarQuery.data ?? EMPTY_INLINE_COMMENT_THREADS;
	const inlineCommentBlocks = commentsQuery.data ?? EMPTY_INLINE_COMMENT_BLOCKS;
	const [openRequest, setOpenRequest] = useState<InlineCommentOpenRequest | null>(null);
	const [deepLinkedSelectionId, setDeepLinkedSelectionId] = useState(initialSelectionId);
	const [createdCommentId, setCreatedCommentId] = useState<number | null>(null);
	const [selection, setSelection] = useState<InlineCommentSelectionTarget | null>(null);
	const [composerAnchorId, setComposerAnchorId] = useState<number | null>(null);
	const [sidebarMode, setSidebarMode] = useState<InlineCommentSidebarMode>(
		initialSelectionId === null ? 'all' : 'single',
	);
	const [commentEntrySource, setCommentEntrySource] = useState<InlineCommentCreateEntrySource>(
		initialSelectionId === null ? 'all' : 'highlight',
	);
	const [createRequestId, setCreateRequestId] = useState(0);
	const [scrollResetKey, setScrollResetKey] = useState(0);
	const hasHandledDeepLinkNavigationRef = useRef(false);
	const [isDeletedCommentToastVisible, setIsDeletedCommentToastVisible] = useState(showDeletedCommentToast);
	const visibleThreads = selection
		? []
		: createdCommentId !== null
			? sidebarThreads.filter(({ anchor }) => anchor.comments.some((comment) => comment.commentId === createdCommentId))
			: deepLinkedSelectionId !== null
				? sidebarThreads.filter(({ anchor }) => anchor.anchorId === deepLinkedSelectionId)
				: openRequest
					? sidebarThreads.filter(
							({ blockId, anchor }) =>
								blockId === openRequest.blockId &&
								openRequest.anchorIds.includes(anchor.anchorId) &&
								(openRequest.source !== 'block' || anchor.state === 'ACTIVE'),
						)
					: sidebarThreads;
	const inlineCommentCount = inlineCommentBlocks.reduce(
		(total, block) => total + block.anchors.reduce((blockTotal, anchor) => blockTotal + anchor.commentCount, 0),
		0,
	);

	useEffect(() => {
		if (
			hasHandledDeepLinkNavigationRef.current ||
			deepLinkedSelectionId === null ||
			!commentsQuery.isSuccess ||
			!sidebarQuery.isSuccess
		) {
			return;
		}

		hasHandledDeepLinkNavigationRef.current = true;
		const thread = sidebarThreads.find(({ anchor }) => anchor.anchorId === deepLinkedSelectionId);
		if (thread?.anchor.state === 'ACTIVE') {
			scrollToThreadAnchor(thread);
		}
	}, [commentsQuery.isSuccess, deepLinkedSelectionId, sidebarQuery.isSuccess, sidebarThreads]);

	const openComments = useCallback(
		(request: InlineCommentOpenRequest | null, mode: InlineCommentSidebarMode) => {
			setScrollResetKey((previous) => previous + 1);
			openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
			setCommentEntrySource(request === null ? 'all' : request.source);
			setSidebarMode(mode);
			setSelection(null);
			setCreatedCommentId(null);
			setDeepLinkedSelectionId(null);
			setComposerAnchorId(null);
			setOpenRequest(request);
			openCommentView('comments');
		},
		[openCommentView],
	);

	const handleInlineCommentCreate = useCallback(
		(target: InlineCommentSelectionTarget, entrySource: InlineCommentCreateEntrySource = 'selection_toolbar') => {
			openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
			setCreatedCommentId(null);
			setDeepLinkedSelectionId(null);
			const existingThread = inlineCommentBlocks
				.flatMap(({ blockId, anchors }) => anchors.map((anchor) => ({ blockId, anchor })))
				.find(
					({ blockId, anchor }) =>
						blockId === target.blockId &&
						anchor.state === 'ACTIVE' &&
						anchor.range.startOffset === target.startOffset &&
						anchor.range.endOffset === target.endOffset &&
						anchor.selectedText === target.selectedText,
				);
			setSelection(existingThread ? null : target);
			setCommentEntrySource(entrySource);
			setComposerAnchorId(existingThread?.anchor.anchorId ?? null);
			setSidebarMode('single');
			setOpenRequest(
				existingThread
					? { blockId: existingThread.blockId, anchorIds: [existingThread.anchor.anchorId], source: 'highlight' }
					: null,
			);
			setCreateRequestId((previous) => previous + 1);
			openCommentView('comments');
		},
		[inlineCommentBlocks, openCommentView],
	);

	const handleAuthenticatedCreate = useCallback(
		(...args: Parameters<typeof handleInlineCommentCreate>) => {
			cancelAnchorNavigation();
			handleInlineCommentCreate(...args);
		},
		[cancelAnchorNavigation, handleInlineCommentCreate],
	);

	const handleSelectionCreate = useInlineCommentAuthAction({
		postId,
		isCommentsReady: commentsQuery.isSuccess && sidebarQuery.isSuccess,
		onCreate: handleAuthenticatedCreate,
	});

	const handleInlineCommentOpen = useCallback(
		(request: InlineCommentOpenRequest) => {
			cancelAnchorNavigation();
			analytics.inlineCommentEntryClicked({ postId, entrySource: request.source });
			openComments(request, request.source === 'highlight' ? 'single' : 'block');
		},
		[cancelAnchorNavigation, openComments, postId],
	);

	const handleAllCommentsOpen = useCallback(() => {
		cancelAnchorNavigation();
		analytics.inlineCommentEntryClicked({ postId, entrySource: 'all' });
		openComments(null, 'all');
	}, [cancelAnchorNavigation, openComments, postId]);

	const closeComments = useCallback(() => {
		closeCommentView();
		setIsDeletedCommentToastVisible(false);
		if (isDocked && openerRef.current?.isConnected) openerRef.current.focus({ preventScroll: true });
	}, [closeCommentView, isDocked]);

	useEffect(() => {
		if (view === 'closed' && isDocked && openerRef.current?.isConnected) {
			openerRef.current.focus({ preventScroll: true });
		}
	}, [view, isDocked]);

	const handleSelectionModeChange = useCallback(
		(active: boolean) => {
			if (active) {
				openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
				openCommentView('selection');
			} else closeCommentView();
		},
		[openCommentView, closeCommentView],
	);

	const handleAnchorNavigate = useCallback(
		(thread: InlineCommentThreadModel) => {
			if (thread.anchor.state === 'OUTDATED') {
				return;
			}
			analytics.inlineCommentAnchorNavigationClicked({ postId, anchorState: thread.anchor.state });

			if (isDocked) navigateToThread(thread);
			else {
				pendingNavigation.current = thread;
				closeComments();
			}
		},
		[closeComments, isDocked, navigateToThread, postId],
	);

	const panelProps = {
		postId,
		scrollResetKey,
		selection,
		composerAnchorId,
		mode: sidebarMode,
		entrySource: commentEntrySource,
		showDeletedCommentToast: isDeletedCommentToastVisible,
		threads: visibleThreads,
		isLoading: sidebarQuery.isPending,
		isError: sidebarQuery.isError,
		onRetry: () => void sidebarQuery.refetch(),
		onCreated: (commentAnchorId: number) => {
			setSelection(null);
			setCreatedCommentId(commentAnchorId);
			setDeepLinkedSelectionId(null);
			setComposerAnchorId(null);
		},
		onClose: closeComments,
		onNavigate: handleAnchorNavigate,
	};

	return (
		<>
			<aside className={`${styles.commentsColumn} max-md:hidden!`}>
				<div className={styles.commentsEntry}>
					{!isMobileViewport && (
						<PostAllCommentsButton commentCount={inlineCommentCount} onClick={handleAllCommentsOpen} />
					)}
				</div>
			</aside>

			{isMobileViewport && (
				<div
					hidden={view !== 'closed'}
					className="fixed right-5 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40 md:hidden"
				>
					<Button
						className="h-12! rounded-full! px-5! shadow-sm"
						aria-label={`전체 댓글 ${inlineCommentCount}개 보기`}
						onClick={handleAllCommentsOpen}
					>
						<CommentIcon aria-hidden="true" focusable="false" className="size-5 shrink-0" />
						전체 댓글
					</Button>
				</div>
			)}

			<div className={`${styles.articleColumn} pt-5 pb-30 sm:pt-10 sm:pb-35`}>
				<PostDetailContent
					html={html}
					postId={postId}
					ownerType={ownerType}
					category={category}
					inlineCommentBlocks={inlineCommentBlocks}
					enableInlineCommentSelectionDebug={enableInlineCommentSelectionDebug}
					onInlineCommentOpen={handleInlineCommentOpen}
					isSelectionMode={view === 'selection'}
					onSelectionModeChange={handleSelectionModeChange}
					onInlineCommentCreate={commentsQuery.isSuccess ? handleSelectionCreate : undefined}
					onFloatingCommentCreate={
						commentsQuery.isSuccess
							? (target) => {
									analytics.inlineCommentSelectionReplyClicked({ postId, entrySource: 'floating_button' });
									handleSelectionCreate(target, 'floating_button');
									if (!isAuthenticated) closeCommentView();
								}
							: undefined
					}
				/>

				<Divider className="mt-30 sm:mt-40" />
				<div className={`${styles.profileSection} mx-auto max-w-lg`}>{profileSection}</div>
				{afterProfile}
			</div>

			{isDocked &&
				createPortal(
					<PostCommentsDockedCard key={createRequestId} open={isCommentsSidebarOpen} {...panelProps} />,
					dockHost,
				)}
			{isLayoutReady && !isDocked && (
				<PostCommentsSidebar
					key={createRequestId}
					open={isCommentsSidebarOpen}
					onClosed={handleCommentsClosed}
					{...panelProps}
				/>
			)}
		</>
	);
}
