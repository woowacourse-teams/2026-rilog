'use client';

import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import ChevronIcon from '@/shared/assets/icons/chevron.svg';
import Button from '@/shared/ui/button/Button';

import InlineCommentItem from './InlineCommentItem';
import InlineCommentQuote from './InlineCommentQuote';

interface InlineCommentThreadProps {
	thread: InlineCommentThreadModel;
	onNavigate: (thread: InlineCommentThreadModel) => void;
}

export default function InlineCommentThread({ thread, onNavigate }: InlineCommentThreadProps) {
	return (
		<section aria-label={`“${thread.anchor.selectedText}” 댓글`}>
			<details className="group">
				<summary className="flex list-none items-start justify-between gap-3 px-5 py-6 text-left transition-colors duration-200 hover:bg-surface-hover motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
					<div className="min-w-0 flex-1 border-l-4 border-border-default pl-2">
						<InlineCommentQuote anchor={thread.anchor} />
						<div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out group-open:grid-rows-[1fr] motion-reduce:transition-none">
							<div className="invisible min-h-0 overflow-hidden opacity-0 transition-opacity duration-200 group-open:visible group-open:opacity-100 motion-reduce:transition-none">
								<button
									type="button"
									className="mt-1 rounded py-1 text-label-1 text-text-secondary transition-colors hover:text-text-placeholder focus-visible:outline-2 focus-visible:outline-focus-ring"
									onClick={(event) => {
										event.preventDefault();
										event.stopPropagation();
										onNavigate(thread);
									}}
								>
									본문으로 이동
								</button>
							</div>
						</div>
					</div>
					<ChevronIcon
						aria-hidden="true"
						focusable="false"
						className="size-6 shrink-0 rounded p-1 text-text-secondary transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
					/>
				</summary>
				<div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-open:grid-rows-[1fr] motion-reduce:transition-none">
					<div className="min-h-0 overflow-hidden">
						{thread.anchor.comments.length === 0 ? (
							<p className="px-8 pt-5 pb-8 text-label-2 text-text-placeholder">아직 댓글이 없습니다.</p>
						) : (
							<div className="px-8 pb-8">
								<ul>
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
								<Button size="sm" variant="secondary" fullWidth>
									댓글 추가
								</Button>
							</div>
						)}
					</div>
				</div>
			</details>
		</section>
	);
}
