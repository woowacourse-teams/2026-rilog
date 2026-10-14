'use client';

import { useId, useRef } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import BaseModal from '@/shared/ui/modal/BaseModal';

import PostCommentsPanelContent from './PostCommentsPanelContent';

interface PostCommentsSidebarProps extends Omit<
	Parameters<typeof PostCommentsPanelContent>[0],
	'titleId' | 'titleRef' | 'inputRef'
> {
	open: boolean;
}

export default function PostCommentsSidebar({ open, ...contentProps }: PostCommentsSidebarProps) {
	const titleId = useId();
	const titleRef = useRef<HTMLHeadingElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const { isAuthenticated, isInitialized } = useAuth();
	const shouldFocusInput =
		isAuthenticated && isInitialized && (contentProps.selection != null || contentProps.composerAnchorId != null);

	return (
		<BaseModal
			open={open}
			onDismiss={contentProps.onClose}
			accessibility={{ labelledBy: titleId }}
			initialFocusRef={shouldFocusInput ? inputRef : titleRef}
			className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none translate-x-full overflow-hidden border-l border-border-default transition-[transform,overlay,display] [transition-behavior:allow-discrete] duration-(--modal-exit-duration) ease-out data-[state=open]:translate-x-0 data-[state=open]:duration-(--modal-enter-duration) motion-reduce:transition-none sm:w-112"
		>
			<PostCommentsPanelContent {...contentProps} titleId={titleId} titleRef={titleRef} inputRef={inputRef} />
		</BaseModal>
	);
}
