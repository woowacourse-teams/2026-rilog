'use client';

import { useCallback, useState } from 'react';

import type { DraftPostItem } from '@/features/post-write/model/post-draft';
import type { EditorDocument } from '@/features/post-write/model/post-publication';

const PLACEHOLDER_DRAFT_POSTS: readonly DraftPostItem[] = [
	{ id: 34, title: '디자인 시스템 도입 회고', savedAt: '2026-08-21T04:40:07.585624' },
	{ id: 37, title: 'TypeScript 타입 설계 회고', savedAt: '2026-08-20T04:40:07.585624' },
	{ id: 21, title: '접근성 개선 기록', savedAt: '2026-08-19T04:40:07.585624' },
	{ id: 4, title: 'Next.js 마이그레이션', savedAt: '2026-08-18T04:40:07.585624' },
];

interface UsePostDraftsOptions {
	prepareDocument: () => EditorDocument | null;
	initialPosts?: readonly DraftPostItem[];
}

export function usePostDrafts({ prepareDocument, initialPosts = PLACEHOLDER_DRAFT_POSTS }: UsePostDraftsOptions) {
	const [posts, setPosts] = useState<DraftPostItem[]>(() => [...initialPosts]);
	const [isListModalOpen, setIsListModalOpen] = useState(false);
	const [postIdPendingDeletion, setPostIdPendingDeletion] = useState<number | null>(null);

	const save = useCallback(() => {
		const document = prepareDocument();
		if (document === null) {
			return;
		}

		// TODO: 임시 저장 API 연동
	}, [prepareDocument]);

	const openList = useCallback(() => {
		setIsListModalOpen(true);
	}, []);

	const closeList = useCallback(() => {
		setIsListModalOpen(false);
	}, []);

	const requestDeletion = useCallback((postId: number) => {
		setPostIdPendingDeletion(postId);
	}, []);

	const cancelDeletion = useCallback(() => {
		setPostIdPendingDeletion(null);
	}, []);

	const confirmDeletion = useCallback(() => {
		if (postIdPendingDeletion === null) {
			return;
		}

		setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postIdPendingDeletion));
		setPostIdPendingDeletion(null);
	}, [postIdPendingDeletion]);

	return {
		posts,
		isListModalOpen,
		isDeletionModalOpen: postIdPendingDeletion !== null,
		save,
		openList,
		closeList,
		requestDeletion,
		cancelDeletion,
		confirmDeletion,
	};
}
