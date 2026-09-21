'use client';

import { useId, useState } from 'react';

import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import ChevronIcon from '@/shared/assets/icons/chevron.svg';

import InlineCommentItem from './InlineCommentItem';
import InlineCommentQuote from './InlineCommentQuote';

interface InlineCommentThreadProps {
	thread: InlineCommentThreadModel;
	onNavigate: (thread: InlineCommentThreadModel) => void;
}

export default function InlineCommentThread({ thread, onNavigate }: InlineCommentThreadProps) {
	const [isOpen, setIsOpen] = useState(false);
	const commentsId = useId();

	return (
		<section aria-label={`“${thread.anchor.selectedText}” 댓글`}>
			<InlineCommentQuote anchor={thread.anchor} onNavigate={() => onNavigate(thread)} />
			{thread.anchor.comments.length === 0 ? (
				<p className="mt-8 pl-3 text-label-2 text-text-placeholder">아직 댓글이 없습니다.</p>
			) : (
				<>
					<button
						type="button"
						aria-expanded={isOpen}
						aria-controls={commentsId}
						className="flex items-center gap-1 px-3 py-1 text-label-2 text-text-secondary"
						onClick={() => setIsOpen((prev) => !prev)}
					>
						{isOpen ? '댓글 접기' : '댓글 보기'}
						<ChevronIcon className={isOpen ? 'rotate-180 transition-[rotate]' : 'transition-[rotate]'} />
					</button>
					<ul
						id={commentsId}
						aria-hidden={!isOpen}
						inert={!isOpen}
						className={`grid overflow-hidden pl-3 transition-[grid-template-rows,opacity] duration-200 ease-in-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
					>
						<li className="min-h-0 overflow-hidden">
							<div className="space-y-6 pt-8">
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
		</section>
	);
}
