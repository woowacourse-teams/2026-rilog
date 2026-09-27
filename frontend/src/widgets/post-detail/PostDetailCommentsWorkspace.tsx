'use client';

import { useCallback, useState } from 'react';

import type { ReactNode } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import type { PostCategory } from '@/domains/post/model/post';
import { usePostInlineComments } from '@/features/post-detail/hooks/use-post-inline-comments';
import { usePostInlineCommentsSidebar } from '@/features/post-detail/hooks/use-post-inline-comments-sidebar';
import type { InlineCommentBlockModel } from '@/features/post-detail/model/inline-comment';
import type {
	InlineCommentOpenRequest,
	InlineCommentSidebarMode,
} from '@/features/post-detail/model/inline-comment-interaction';
import type { InlineCommentThreadModel } from '@/features/post-detail/model/inline-comment-thread';
import PostAllCommentsButton from '@/features/post-detail/ui/PostAllCommentsButton';
import PostCommentsSidebar from '@/features/post-detail/ui/PostCommentsSidebar';
import PostDetailContent from '@/features/post-detail/ui/PostDetailContent';
import Divider from '@/shared/ui/divider/Divider';

import styles from './PostDetail.module.css';

interface PostDetailCommentsWorkspaceProps {
	html: string;
	postId: number;
	ownerType: BlogType;
	category: PostCategory;
	enableInlineCommentSelectionDebug: boolean;
	profileSection: ReactNode;
	afterProfile?: ReactNode;
}

const EMPTY_INLINE_COMMENT_BLOCKS: InlineCommentBlockModel[] = [];

const findAnchorElement = (anchorId: number) =>
	Array.from(document.querySelectorAll<HTMLElement>('[data-inline-comment-anchor-id]')).find(
		(element) => element.dataset.inlineCommentAnchorId === String(anchorId),
	);

export default function PostDetailCommentsWorkspace({
	html,
	postId,
	ownerType,
	category,
	enableInlineCommentSelectionDebug,
	profileSection,
	afterProfile,
}: PostDetailCommentsWorkspaceProps) {
	const [isCommentsSidebarOpen, setIsCommentsSidebarOpen] = useState(false);
	const commentsQuery = usePostInlineComments(postId);
	const sidebarQuery = usePostInlineCommentsSidebar(postId);
	const sidebarThreads = sidebarQuery.data ?? [];
	const inlineCommentBlocks = commentsQuery.data ?? EMPTY_INLINE_COMMENT_BLOCKS;
	const [openRequest, setOpenRequest] = useState<InlineCommentOpenRequest | null>(null);
	const [sidebarMode, setSidebarMode] = useState<InlineCommentSidebarMode>('all');
	const visibleThreads = openRequest
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

	const openComments = useCallback((request: InlineCommentOpenRequest | null, mode: InlineCommentSidebarMode) => {
		setSidebarMode(mode);
		setOpenRequest(request);
		setIsCommentsSidebarOpen(true);
	}, []);

	const handleInlineCommentOpen = useCallback(
		(request: InlineCommentOpenRequest) => {
			openComments(request, request.source === 'highlight' ? 'single' : 'block');
		},
		[openComments],
	);

	const handleAllCommentsOpen = useCallback(() => {
		openComments(null, 'all');
	}, [openComments]);

	const handleAnchorNavigate = useCallback((thread: InlineCommentThreadModel) => {
		if (thread.anchor.state === 'OUTDATED') {
			return;
		}

		setIsCommentsSidebarOpen(false);
		window.setTimeout(() => {
			const target =
				findAnchorElement(thread.anchor.anchorId) ??
				document.querySelector<HTMLElement>(`[data-inline-comment-block-id="${thread.blockId}"]`);
			target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}, 140);
	}, []);

	return (
		<>
			<div className={`${styles.articleColumn} pt-5 pb-30 sm:pt-10 sm:pb-35`}>
				<PostDetailContent
					html={html}
					postId={postId}
					ownerType={ownerType}
					category={category}
					inlineCommentBlocks={inlineCommentBlocks}
					enableInlineCommentSelectionDebug={enableInlineCommentSelectionDebug}
					onInlineCommentOpen={handleInlineCommentOpen}
				/>

				<Divider className="mt-30 sm:mt-40" />
				<div className={styles.compactCommentsEntry}>
					<PostAllCommentsButton commentCount={inlineCommentCount} onClick={handleAllCommentsOpen} />
				</div>
				<div className={`${styles.profileSection} mx-auto max-w-lg`}>{profileSection}</div>
				{afterProfile}
			</div>

			<aside className={styles.commentsColumn}>
				<div className={styles.commentsSticky}>
					<PostAllCommentsButton commentCount={inlineCommentCount} onClick={handleAllCommentsOpen} />
				</div>
			</aside>

			<PostCommentsSidebar
				mode={sidebarMode}
				open={isCommentsSidebarOpen}
				threads={visibleThreads}
				isLoading={sidebarQuery.isPending}
				isError={sidebarQuery.isError}
				onRetry={() => void sidebarQuery.refetch()}
				onClose={() => setIsCommentsSidebarOpen(false)}
				onNavigate={handleAnchorNavigate}
			/>
		</>
	);
}
