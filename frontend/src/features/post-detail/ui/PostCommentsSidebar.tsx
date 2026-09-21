'use client';

import { useId, useRef } from 'react';

import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import XIcon from '@/shared/assets/icons/x.svg';
import Button from '@/shared/ui/button/Button';
import Divider from '@/shared/ui/divider/Divider';
import BaseModal from '@/shared/ui/modal/BaseModal';

import InlineCommentThread from './InlineCommentThread';

interface PostCommentsSidebarProps {
	open: boolean;
	threads: readonly InlineCommentThreadModel[];
	onClose: () => void;
	onNavigate: (thread: InlineCommentThreadModel) => void;
}

export default function PostCommentsSidebar({ open, threads, onClose, onNavigate }: PostCommentsSidebarProps) {
	const titleId = useId();
	const titleRef = useRef<HTMLHeadingElement>(null);
	const commentCount = threads.reduce((total, thread) => total + thread.anchor.comments.length, 0);

	// TODO: 전체 댓글로 진입 시 헤더 "전체 인라인 댓글"

	return (
		<BaseModal
			open={open}
			onDismiss={onClose}
			accessibility={{ labelledBy: titleId }}
			initialFocusRef={titleRef}
			className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-[min(28rem,calc(100vw-1rem))] translate-x-full overflow-hidden border-l border-border-default shadow-modal transition-[transform,overlay,display] [transition-behavior:allow-discrete] duration-(--modal-exit-duration) ease-out data-[state=open]:translate-x-0 data-[state=open]:duration-(--modal-enter-duration) motion-reduce:transition-none"
		>
			<div className="flex h-full min-h-0 flex-col">
				<header className="flex h-15 shrink-0 items-center justify-between border-b border-border-default px-5">
					<h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-title-1 font-semibold text-text-primary">
						인라인 댓글 <span className="ml-1 text-body-1 font-medium text-text-placeholder">{commentCount}</span>
					</h2>
					<Button variant="ghost" size="icon" aria-label="댓글 사이드바 닫기" onClick={onClose}>
						<XIcon aria-hidden="true" className="size-5" />
					</Button>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
					{threads.length === 0 ? (
						<p className="px-5 py-6 text-body-1 text-text-placeholder">표시할 댓글이 없습니다.</p>
					) : (
						<div>
							{threads.map((thread, index) => (
								<div key={thread.anchor.anchorId}>
									<InlineCommentThread thread={thread} onNavigate={onNavigate} />
									<Divider className="mx-5" />
								</div>
							))}
						</div>
					)}
				</div>

				{/*<footer className="shrink-0 border-t border-border-default bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">*/}
				{/*	<input*/}
				{/*		type="text"*/}
				{/*		aria-label="댓글 입력"*/}
				{/*		placeholder="댓글을 입력하세요."*/}
				{/*		className="h-11 w-full rounded-lg border border-border-default bg-background px-3 text-body-1 text-text-primary outline-none placeholder:text-text-placeholder focus:border-focus-ring focus:ring-1 focus:ring-focus-ring"*/}
				{/*	/>*/}
				{/*</footer>*/}
			</div>
		</BaseModal>
	);
}
