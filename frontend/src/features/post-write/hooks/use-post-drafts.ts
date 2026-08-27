'use client';

import { useCallback, useMemo, useState } from 'react';

import type { DraftPostItem } from '@/features/post-write/model/post-draft';
import type { EditorDocument } from '@/features/post-write/model/post-publication';

interface UsePostDraftsOptions {
	prepareDocument: () => EditorDocument | null;
	posts?: readonly DraftPostItem[];
	onSave?: (document: EditorDocument) => void | Promise<void>;
}

export function usePostDrafts({ prepareDocument, posts = [], onSave }: UsePostDraftsOptions) {
	const [removedPostIds, setRemovedPostIds] = useState<Set<number>>(() => new Set());
	const [isListModalOpen, setIsListModalOpen] = useState(false);
	const [postIdPendingDeletion, setPostIdPendingDeletion] = useState<number | null>(null);
	const visiblePosts = useMemo(() => posts.filter(({ id }) => !removedPostIds.has(id)), [posts, removedPostIds]);

	const save = useCallback(() => {
		const document = prepareDocument();
		if (document === null) {
			return;
		}

		void onSave?.(document);
	}, [onSave, prepareDocument]);

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

		setRemovedPostIds((currentIds) => new Set(currentIds).add(postIdPendingDeletion));
		setPostIdPendingDeletion(null);
	}, [postIdPendingDeletion]);

	return {
		posts: visiblePosts,
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
