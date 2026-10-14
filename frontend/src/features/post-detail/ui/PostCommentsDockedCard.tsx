'use client';

import { useEffect, useId, useRef } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';

import PostCommentsPanelContent from './PostCommentsPanelContent';

type PostCommentsDockedCardProps = Omit<
	Parameters<typeof PostCommentsPanelContent>[0],
	'titleId' | 'titleRef' | 'inputRef'
> & { open: boolean };

export default function PostCommentsDockedCard({ open, ...props }: PostCommentsDockedCardProps) {
	const titleId = useId();
	const titleRef = useRef<HTMLHeadingElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const { isAuthenticated, isInitialized } = useAuth();
	const hasComposerThread =
		props.composerAnchorId != null && props.threads.some(({ anchor }) => anchor.anchorId === props.composerAnchorId);
	const shouldFocusInput = open && isAuthenticated && isInitialized && (props.selection != null || hasComposerThread);

	useEffect(() => {
		if (shouldFocusInput) inputRef.current?.focus({ preventScroll: true });
	}, [shouldFocusInput, props.selection, props.composerAnchorId]);

	return (
		<section
			role="region"
			aria-labelledby={titleId}
			aria-hidden={!open}
			inert={!open}
			data-state={open ? 'open' : 'closed'}
			className="h-[calc(100dvh-3rem)] w-full overflow-hidden rounded-l-xl border border-border-default bg-surface"
		>
			<PostCommentsPanelContent {...props} titleId={titleId} titleRef={titleRef} inputRef={inputRef} />
		</section>
	);
}
