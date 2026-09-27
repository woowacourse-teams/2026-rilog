'use client';

import type { InlineCommentThreadModel } from '../model/inline-comment-thread';
import type { RefObject } from 'react';

import { useInlineCommentDraft } from '../hooks/use-inline-comment-draft';

import InlineCommentInput from './InlineCommentInput';
import InlineCommentThreadContent from './InlineCommentThreadContent';

interface InlineCommentThreadProps {
	thread: InlineCommentThreadModel;
	onNavigate: (thread: InlineCommentThreadModel) => void;
	isCollapsible?: boolean;
	inputRef?: RefObject<HTMLTextAreaElement | null>;
}

export default function InlineCommentThread({
	thread,
	onNavigate,
	isCollapsible = true,
	inputRef,
}: InlineCommentThreadProps) {
	const { commentText, onCommentChange } = useInlineCommentDraft(thread.anchor.anchorId);

	return (
		<InlineCommentThreadContent
			anchor={thread.anchor}
			isCollapsible={isCollapsible}
			onNavigate={() => onNavigate(thread)}
			renderInput={(isOpen) => (
				<InlineCommentInput isOpen={isOpen} value={commentText} onChange={onCommentChange} inputRef={inputRef} />
			)}
		/>
	);
}
