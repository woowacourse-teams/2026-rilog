'use client';

import { useId, useState } from 'react';

import type { ReactNode } from 'react';

import type { InlineCommentAnchorModel } from '@/features/post-detail/model/inline-comment';
import ChevronIcon from '@/shared/assets/icons/chevron.svg';

import InlineCommentItem from './InlineCommentItem';
import InlineCommentQuote from './InlineCommentQuote';

interface InlineCommentThreadContentProps {
	postId: number;
	anchor: Pick<InlineCommentAnchorModel, 'selectedText' | 'state' | 'comments'>;
	isCollapsible: boolean;
	onNavigate?: () => void;
	renderInput?: (isOpen: boolean) => ReactNode;
}

export default function InlineCommentThreadContent({
	postId,
	anchor,
	isCollapsible,
	onNavigate,
	renderInput,
}: InlineCommentThreadContentProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const isOpen = !isCollapsible || isExpanded;
	const panelId = useId();

	return (
		<section aria-label={`"${anchor.selectedText}" 댓글`}>
			<div
				className={`flex items-start justify-between gap-3 rounded px-5 py-6 text-left ${isCollapsible ? 'cursor-pointer transition-colors duration-200 hover:bg-surface-hover motion-reduce:transition-none' : ''}`}
				onClick={isCollapsible ? () => setIsExpanded((prev) => !prev) : undefined}
			>
				<div className="min-w-0 flex-1 border-l-4 border-border-default pl-2">
					{isCollapsible ? (
						<button
							type="button"
							aria-expanded={isOpen}
							aria-controls={panelId}
							aria-label={isOpen ? '댓글 접기' : '댓글 펼치기'}
							className="w-full text-left"
						>
							<InlineCommentQuote anchor={anchor} />
						</button>
					) : (
						<InlineCommentQuote anchor={anchor} />
					)}
					{anchor.state === 'ACTIVE' && onNavigate !== undefined && (
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
										onNavigate?.();
									}}
								>
									본문으로 이동
								</button>
							</div>
						</div>
					)}
				</div>
				{isCollapsible && (
					<ChevronIcon
						aria-hidden="true"
						focusable="false"
						className={`size-6 shrink-0 rounded p-1 text-text-secondary transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
					/>
				)}
			</div>
			<div
				className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
			>
				<div className="min-h-0 overflow-hidden" {...(!isOpen && { inert: true })}>
					<div className="px-8 pb-4">
						{anchor.comments.length === 0 ? (
							<p
								id={panelId}
								aria-hidden={!isOpen}
								{...(!isOpen && { inert: true })}
								className="pb-6 text-label-2 text-text-placeholder"
							>
								아직 댓글이 없습니다.
							</p>
						) : (
							<ul id={panelId} aria-hidden={!isOpen} {...(!isOpen && { inert: true })}>
								<li className="py-5">
									<div className="space-y-8">
										{anchor.comments.map((comment) => (
											<div key={comment.commentId}>
												<InlineCommentItem postId={postId} comment={comment} />
											</div>
										))}
									</div>
								</li>
							</ul>
						)}
						{renderInput && <div aria-hidden={!isOpen}>{renderInput(isOpen)}</div>}
					</div>
				</div>
			</div>
		</section>
	);
}
