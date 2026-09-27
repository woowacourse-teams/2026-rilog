'use client';

import { useCallback, useState } from 'react';

import type { ReactNode } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import type { PostCategory } from '@/domains/post/model/post';
import {
	getAllInlineCommentThreads,
	getInlineCommentThreadsByRequest,
	getInlineCommentThreadForSelection,
} from '@/features/post-detail/lib/get-inline-comment-threads';
import type {
	InlineCommentOpenRequest,
	InlineCommentSelectionTarget,
} from '@/features/post-detail/model/inline-comment-interaction';
import type { InlineCommentThreadModel } from '@/features/post-detail/model/inline-comment-thread';
import PostAllCommentsButton from '@/features/post-detail/ui/PostAllCommentsButton';
import PostCommentsSidebar from '@/features/post-detail/ui/PostCommentsSidebar';
import PostDetailContent from '@/features/post-detail/ui/PostDetailContent';
import type { InlineCommentBlockResponse } from '@/shared/api/posts/types';
import Divider from '@/shared/ui/divider/Divider';

import styles from './PostDetail.module.css';

interface PostDetailCommentsWorkspaceProps {
	html: string;
	postId: number;
	ownerType: BlogType;
	category: PostCategory;
	inlineCommentBlocks: readonly InlineCommentBlockResponse[];
	enableInlineCommentSelectionDebug: boolean;
	profileSection: ReactNode;
	afterProfile?: ReactNode;
}

const findAnchorElement = (anchorId: number) =>
	Array.from(document.querySelectorAll<HTMLElement>('[data-inline-comment-anchor-id]')).find(
		(element) => element.dataset.inlineCommentAnchorId === String(anchorId),
	);

export default function PostDetailCommentsWorkspace({
	html,
	postId,
	ownerType,
	category,
	inlineCommentBlocks,
	enableInlineCommentSelectionDebug,
	profileSection,
	afterProfile,
}: PostDetailCommentsWorkspaceProps) {
	const [isCommentsSidebarOpen, setIsCommentsSidebarOpen] = useState(false);
	const [visibleThreads, setVisibleThreads] = useState<InlineCommentThreadModel[]>([]);
	const [selection, setSelection] = useState<InlineCommentSelectionTarget | null>(null);
	const [initiallyOpenAnchorId, setInitiallyOpenAnchorId] = useState<number | null>(null);
	const [createRequestId, setCreateRequestId] = useState(0);
	const inlineCommentCount = inlineCommentBlocks.reduce(
		(total, block) => total + block.anchors.reduce((blockTotal, anchor) => blockTotal + anchor.comments.length, 0),
		0,
	);

	const openComments = useCallback((threads: InlineCommentThreadModel[]) => {
		setSelection(null);
		setInitiallyOpenAnchorId(null);
		setVisibleThreads(threads);
		setIsCommentsSidebarOpen(true);
	}, []);

	const handleInlineCommentCreate = (target: InlineCommentSelectionTarget) => {
		const existingThread = getInlineCommentThreadForSelection(inlineCommentBlocks, target);
		setSelection(existingThread ? null : target);
		setInitiallyOpenAnchorId(existingThread?.anchor.anchorId ?? null);
		setVisibleThreads(existingThread ? [existingThread] : []);
		setCreateRequestId((previous) => previous + 1);
		setIsCommentsSidebarOpen(true);
	};

	const handleInlineCommentOpen = useCallback(
		(request: InlineCommentOpenRequest) => {
			openComments(getInlineCommentThreadsByRequest(inlineCommentBlocks, request));
		},
		[inlineCommentBlocks, openComments],
	);

	const handleAllCommentsOpen = useCallback(() => {
		openComments(getAllInlineCommentThreads(inlineCommentBlocks));
	}, [inlineCommentBlocks, openComments]);

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
					onInlineCommentCreate={handleInlineCommentCreate}
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
				key={createRequestId}
				postId={postId}
				selection={selection}
				initiallyOpenAnchorId={initiallyOpenAnchorId}
				open={isCommentsSidebarOpen}
				threads={visibleThreads}
				onClose={() => setIsCommentsSidebarOpen(false)}
				onNavigate={handleAnchorNavigate}
			/>
		</>
	);
}
