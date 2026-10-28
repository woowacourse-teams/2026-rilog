'use client';

import { useId, useState } from 'react';

import type { ReactNode } from 'react';

import { analytics } from '@/features/analytics/model/events';
import type { InlineCommentAnchorModel } from '@/features/post-detail/model/inline-comment';
import ChevronIcon from '@/shared/assets/icons/chevron.svg';
import Button from '@/shared/ui/button/Button';

import InlineCommentItem from './InlineCommentItem';
import InlineCommentQuote from './InlineCommentQuote';

interface InlineCommentThreadContentProps {
	postId: number;
	anchor: Pick<InlineCommentAnchorModel, 'selectedText' | 'state' | 'comments'>;
	isCollapsible: boolean;
	onNavigate?: () => void;
	renderInput?: (isOpen: boolean) => ReactNode;
	onSelectComposer?: () => void;
	isComposerSelected?: boolean;
}

export default function InlineCommentThreadContent({
	postId,
	anchor,
	isCollapsible,
	onNavigate,
	renderInput,
	onSelectComposer,
	isComposerSelected = false,
}: InlineCommentThreadContentProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	const isOpen = !isCollapsible || isExpanded;
	const panelId = useId();
	const toggleThread = () => {
		setIsExpanded((previous) => {
			const next = !previous;
			analytics.inlineCommentThreadToggled({ postId, anchorState: anchor.state, isOpen: next });
			return next;
		});
	};

	return (
		<section aria-label={`"${anchor.selectedText}" 댓글`}>
			<div
				className={`flex items-start justify-between gap-3 rounded px-5 py-6 text-left ${isCollapsible && onSelectComposer === undefined ? 'cursor-pointer transition-colors duration-200 hover:bg-surface-hover motion-reduce:transition-none' : ''}`}
				onClick={isCollapsible && onSelectComposer === undefined ? toggleThread : undefined}
			>
				<div className="w-full min-w-0 border-l-4 border-border-default pl-2">
					<div className="flex w-full min-w-0 items-center justify-between gap-3">
						{onSelectComposer === undefined && isCollapsible ? (
							<button
								type="button"
								aria-expanded={isOpen}
								aria-controls={panelId}
								aria-label={isOpen ? '댓글 접기' : '댓글 펼치기'}
								className="min-w-0 flex-1 text-left"
							>
								<InlineCommentQuote anchor={anchor} />
							</button>
						) : (
							<InlineCommentQuote anchor={anchor} />
						)}
						{isCollapsible &&
							(onSelectComposer !== undefined ? (
								<button
									type="button"
									aria-label={isOpen ? '댓글 접기' : '댓글 펼치기'}
									aria-expanded={isOpen}
									aria-controls={panelId}
									className="flex size-11 shrink-0 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-focus-ring"
									onClick={toggleThread}
								>
									<ChevronIcon
										aria-hidden="true"
										focusable="false"
										className={`size-6 transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
									/>
								</button>
							) : (
								<ChevronIcon
									aria-hidden="true"
									focusable="false"
									className={`size-6 shrink-0 rounded p-1 text-text-secondary transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
								/>
							))}
					</div>
					{anchor.state === 'ACTIVE' && onNavigate !== undefined && (
						<div
							className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
						>
							<div className="min-h-0 overflow-hidden">
								<button
									type="button"
									tabIndex={isOpen ? 0 : -1}
									className="mt-1 rounded py-1 text-label-2 text-text-secondary transition-colors hover:text-text-placeholder focus-visible:outline-2 focus-visible:outline-focus-ring"
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
			</div>
			<div
				className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
			>
				<div className="min-h-0 overflow-hidden" aria-hidden={!isOpen} {...(!isOpen && { inert: true })}>
					<div className="px-8 pb-4">
						{anchor.comments.length === 0 ? (
							<p
								id={panelId}
								aria-hidden={!isOpen}
								{...(!isOpen && { inert: true })}
								className="pb-6 text-label-1 text-text-placeholder"
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
						{onSelectComposer !== undefined && (
							<Button
								variant="ghost"
								size="sm"
								aria-label={`댓글 추가: ${anchor.selectedText}`}
								aria-pressed={isComposerSelected}
								className="min-h-11 px-2!"
								onClick={onSelectComposer}
							>
								<svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" className="size-4" fill="none">
									<path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
								</svg>
								댓글 추가
							</Button>
						)}
						{renderInput && <div aria-hidden={!isOpen}>{renderInput(isOpen)}</div>}
					</div>
				</div>
			</div>
		</section>
	);
}
