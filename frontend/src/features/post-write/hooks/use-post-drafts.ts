'use client';

import { useCallback, useRef, useState } from 'react';

import type { DraftPostItem } from '@/features/post-write/model/post-draft';
import type { EditorDocument } from '@/features/post-write/model/post-publication';
import { isInvalidApiResponseError } from '@/shared/api/response-validation';

interface UsePostDraftsOptions {
	prepareDocument: () => EditorDocument | null;
	posts?: readonly DraftPostItem[];
	onSave?: (document: EditorDocument) => void | Promise<void>;
	onDelete: (postId: number) => Promise<unknown>;
}

export function usePostDrafts({ prepareDocument, posts = [], onSave, onDelete }: UsePostDraftsOptions) {
	const [isListModalOpen, setIsListModalOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [postIdPendingDeletion, setPostIdPendingDeletion] = useState<number | null>(null);
	const isSavingRef = useRef(false);
	const isDeletingRef = useRef(false);

	const save = useCallback(async () => {
		if (isSavingRef.current || onSave === undefined) {
			return;
		}

		const document = prepareDocument();
		if (document === null) {
			return;
		}

		isSavingRef.current = true;
		setIsSaving(true);
		setSaveError(null);
		try {
			await onSave(document);
		} catch (error) {
			setSaveError(
				isInvalidApiResponseError(error)
					? '저장 결과를 확인하지 못했습니다. 이미 저장됐을 수 있으니 임시 저장 목록을 확인해 주세요.'
					: '임시 저장하지 못했습니다. 입력한 내용은 유지됩니다.',
			);
		} finally {
			isSavingRef.current = false;
			setIsSaving(false);
		}
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

	const confirmDeletion = useCallback(async () => {
		if (postIdPendingDeletion === null || isDeletingRef.current) {
			return;
		}

		isDeletingRef.current = true;
		try {
			await onDelete(postIdPendingDeletion);
			setPostIdPendingDeletion(null);
		} catch {
			// mutation error 상태는 호출자가 사용자 피드백으로 표시한다.
		} finally {
			isDeletingRef.current = false;
		}
	}, [onDelete, postIdPendingDeletion]);

	return {
		posts,
		isSaving,
		saveError,
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
