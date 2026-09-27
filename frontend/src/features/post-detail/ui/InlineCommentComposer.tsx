'use client';

import type { InlineCommentSelectionTarget } from '../model/inline-comment-interaction';
import type { RefObject } from 'react';

import { useInlineCommentDraft } from '../hooks/use-inline-comment-draft';

import InlineCommentInput from './InlineCommentInput';

interface InlineCommentComposerProps {
	postId: number;
	selection: InlineCommentSelectionTarget;
	inputRef: RefObject<HTMLTextAreaElement | null>;
}

export default function InlineCommentComposer({ postId, selection, inputRef }: InlineCommentComposerProps) {
	const draftId = `selection:${JSON.stringify([postId, selection.blockId, selection.startOffset, selection.endOffset, selection.selectedText])}`;
	const { commentText, onCommentChange } = useInlineCommentDraft(draftId);

	return (
		<section aria-label={`"${selection.selectedText}" 새 댓글`} className="space-y-5 px-8 py-6">
			<blockquote className="border-l-4 border-border-default pl-2 text-body-1 text-text-secondary">
				{selection.selectedText}
			</blockquote>
			<InlineCommentInput isOpen value={commentText} onChange={onCommentChange} inputRef={inputRef} />
		</section>
	);
}
