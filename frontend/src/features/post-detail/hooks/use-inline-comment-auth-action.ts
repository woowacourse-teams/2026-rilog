'use client';

import { useEffect } from 'react';

import type { InlineCommentSelectionTarget } from '../model/inline-comment-interaction';

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
	onCreate: (target: InlineCommentSelectionTarget) => void;
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

	const handleSelectionCreate = useAuthAction<[InlineCommentSelectionTarget]>({
		action: onCreate,
		beforeAuth: (target) => savePendingInlineCommentSelection(postId, target),
		entrySurface: 'sidebar',
	});

	useEffect(() => {
		if (!isInitialized || !isAuthenticated || !isCommentsReady) return;
		const target = takePendingInlineCommentSelection(postId);
		if (target !== null && isSelectionStillCurrent(target)) {
			queueMicrotask(() => onCreate(target));
		}
	}, [isAuthenticated, isCommentsReady, isInitialized, onCreate, postId]);

	return handleSelectionCreate;
};
