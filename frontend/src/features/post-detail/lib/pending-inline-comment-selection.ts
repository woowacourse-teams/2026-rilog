import type { InlineCommentSelectionTarget } from '../model/inline-comment-interaction';

import { savePendingAuthAction, takePendingAuthAction } from '@/features/login/lib/pending-auth-action';

export const savePendingInlineCommentSelection = (postId: number, target: InlineCommentSelectionTarget) =>
	savePendingAuthAction({ postId, pathname: window.location.pathname, target });

export const takePendingInlineCommentSelection = (postId: number): InlineCommentSelectionTarget | null => {
	const value: unknown = takePendingAuthAction(
		(candidate) => typeof candidate === 'object' && candidate !== null && 'target' in candidate,
	);
	if (
		typeof value !== 'object' ||
		value === null ||
		!('postId' in value) ||
		!('pathname' in value) ||
		!('target' in value)
	) {
		return null;
	}
	if (value.postId !== postId || value.pathname !== window.location.pathname) return null;
	const target = value.target;
	if (
		typeof target !== 'object' ||
		target === null ||
		!('blockId' in target) ||
		!('startOffset' in target) ||
		!('endOffset' in target) ||
		!('selectedText' in target) ||
		typeof target.blockId !== 'string' ||
		target.blockId.length === 0 ||
		typeof target.startOffset !== 'number' ||
		!Number.isSafeInteger(target.startOffset) ||
		target.startOffset < 0 ||
		typeof target.endOffset !== 'number' ||
		!Number.isSafeInteger(target.endOffset) ||
		target.endOffset <= target.startOffset ||
		typeof target.selectedText !== 'string' ||
		target.selectedText.trim().length === 0
	) {
		return null;
	}
	return {
		blockId: target.blockId,
		startOffset: target.startOffset,
		endOffset: target.endOffset,
		selectedText: target.selectedText,
	};
};
