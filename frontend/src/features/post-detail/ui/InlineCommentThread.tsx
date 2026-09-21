'use client';

import { useId } from 'react';

import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import ChevronIcon from '@/shared/assets/icons/chevron.svg';

import InlineCommentItem from './InlineCommentItem';
import InlineCommentQuote from './InlineCommentQuote';

interface InlineCommentThreadProps {
	thread: InlineCommentThreadModel;
	onNavigate: (thread: InlineCommentThreadModel) => void;
}

export default function InlineCommentThread({ thread, onNavigate }: InlineCommentThreadProps) {
	const commentsId = useId();

	return (
		<details aria-label={`“${thread.anchor.selectedText}” 댓글`}>
			{thread.anchor.comments.length === 0 ? (
				<InlineCommentQuote anchor={thread.anchor} onNavigate={() => onNavigate(thread)} />
			) : (
				<>
					<summary className="flex cursor-pointer list-none items-start gap-3 rounded-md px-5 py-5 transition-colors hover:bg-surface-hover active:bg-surface-hover [&::-webkit-details-marker]:hidden">
						<span className="min-w-0 flex-1">
							<InlineCommentQuote anchor={thread.anchor} onNavigate={() => onNavigate(thread)} />
						</span>
						<ChevronIcon
							aria-hidden="true"
							focusable="false"
							className="mt-1 size-6 shrink-0 p-1 text-text-secondary transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
						/>
					</summary>
					<ul id={commentsId} className="grid grid-rows-[1fr] overflow-hidden pr-8 pl-5">
						<li className="min-h-0 overflow-hidden">
							<div className="space-y-5 py-5">
								{thread.anchor.comments.map((comment) => (
									<div key={comment.commentId}>
										<InlineCommentItem comment={comment} />
									</div>
								))}
							</div>
						</li>
					</ul>
				</>
			)}
			{thread.anchor.comments.length === 0 && (
				<p className="mt-6 pl-4 text-label-2 text-text-placeholder">아직 댓글이 없습니다.</p>
			)}
		</details>
	);
}
