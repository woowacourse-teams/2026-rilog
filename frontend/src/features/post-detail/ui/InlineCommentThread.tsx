'use client';

import { useId, useState } from 'react';

import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import ChevronIcon from '@/shared/assets/icons/chevron.svg';

import { useInlineCommentDraft } from '../hooks/use-inline-comment-draft';

import InlineCommentInput from './InlineCommentInput';
import InlineCommentItem from './InlineCommentItem';
import InlineCommentQuote from './InlineCommentQuote';

interface InlineCommentThreadProps {
	thread: InlineCommentThreadModel;
	onNavigate: (thread: InlineCommentThreadModel) => void;
}

export default function InlineCommentThread({ thread, onNavigate }: InlineCommentThreadProps) {
	const { commentText, onCommentChange } = useInlineCommentDraft(thread.anchor.anchorId);
	const [isOpen, setIsOpen] = useState(false);
	const panelId = useId();

	return (
		<section aria-label={`"${thread.anchor.selectedText}" 댓글`}>
			<div
				className="flex cursor-pointer items-start justify-between gap-3 rounded px-5 py-6 text-left transition-colors duration-200 hover:bg-surface-hover motion-reduce:transition-none"
				onClick={() => setIsOpen((prev) => !prev)}
			>
				<div className="min-w-0 flex-1 border-l-4 border-border-default pl-2">
					<button
						type="button"
						aria-expanded={isOpen}
						aria-controls={panelId}
						aria-label={isOpen ? '댓글 접기' : '댓글 펼치기'}
						className="w-full text-left"
					>
						<InlineCommentQuote anchor={thread.anchor} />
					</button>
					{thread.anchor.state === 'ACTIVE' && (
						<div
							className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
						>
							<div className="min-h-0 overflow-hidden">
								<button
									type="button"
									tabIndex={isOpen ? 0 : -1}
									className="mt-1 rounded py-1 text-label-1 text-text-secondary transition-colors hover:text-text-placeholder focus-visible:outline-2 focus-visible:outline-focus-ring"
									onClick={(event) => {
										event.stopPropagation();
										onNavigate(thread);
									}}
								>
									본문으로 이동
								</button>
							</div>
						</div>
					)}
				</div>
				<ChevronIcon
					aria-hidden="true"
					focusable="false"
					className={`size-6 shrink-0 rounded p-1 text-text-secondary transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
				/>
			</div>
			<div
				className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
			>
				<div className="min-h-0 overflow-hidden" {...(!isOpen && { inert: true })}>
					<div className="px-8 pb-8">
						{thread.anchor.comments.length === 0 ? (
							<p
								id={panelId}
								aria-hidden={!isOpen}
								{...(!isOpen && { inert: true })}
								className="pt-5 pb-6 text-label-2 text-text-placeholder"
							>
								아직 댓글이 없습니다.
							</p>
						) : (
							<ul id={panelId} aria-hidden={!isOpen} {...(!isOpen && { inert: true })}>
								<li className="py-5">
									<div className="space-y-8">
										{thread.anchor.comments.map((comment) => (
											<div key={comment.commentId}>
												<InlineCommentItem comment={comment} />
											</div>
										))}
									</div>
								</li>
							</ul>
						)}
						<InlineCommentInput isOpen={isOpen} value={commentText} onChange={onCommentChange} />
					</div>
				</div>
			</div>
		</section>
	);
}
