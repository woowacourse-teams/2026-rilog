'use client';

import { useEffect } from 'react';

import type { InlineCommentSelectionTarget } from '../model/inline-comment-interaction';

import type { InlineCommentCreateEntrySource } from '@/features/analytics/model/analytics-event';
import { useAuth } from '@/features/auth/model/use-auth';
import { useAuthAction } from '@/features/login/model/use-auth-action';

import { findInlineCommentRoot } from '../lib/inline-comment-range';
import { getInlineCommentRootText } from '../lib/inline-comment-selection';
import {
	savePendingInlineCommentSelection,
	takePendingInlineCommentSelection,
} from '../lib/pending-inline-comment-selection';

interface UseInlineCommentAuthActionOptions {
	postId: number;
	isCommentsReady: boolean;
	onCreate: (target: InlineCommentSelectionTarget, entrySource?: InlineCommentCreateEntrySource) => void;
}

const isSelectionStillCurrent = (target: InlineCommentSelectionTarget): boolean => {
	const article = document.querySelector<HTMLElement>('[data-post-detail-content]');
	if (article === null) return false;

	const root = findInlineCommentRoot(article, target.blockId);

	return (
		root !== null && getInlineCommentRootText(root).slice(target.startOffset, target.endOffset) === target.selectedText
	);
};

export const useInlineCommentAuthAction = ({
	postId,
	isCommentsReady,
	onCreate,
}: UseInlineCommentAuthActionOptions) => {
	const { isAuthenticated, isInitialized } = useAuth();

	const handleSelectionCreate = useAuthAction<[InlineCommentSelectionTarget, InlineCommentCreateEntrySource?]>({
		action: onCreate,
		beforeAuth: (target, entrySource) => savePendingInlineCommentSelection(postId, target, entrySource),
		entrySurface: 'sidebar',
	});

	useEffect(() => {
		if (!isInitialized || !isAuthenticated || !isCommentsReady) return;
		const target = takePendingInlineCommentSelection(postId);
		if (target !== null && isSelectionStillCurrent(target)) {
			const { entrySource, ...selection } = target;
			queueMicrotask(() => (entrySource ? onCreate(selection, entrySource) : onCreate(selection)));
		}
	}, [isAuthenticated, isCommentsReady, isInitialized, onCreate, postId]);

	return handleSelectionCreate;
};
