'use client';

import { useRef } from 'react';
import { createPortal } from 'react-dom';

import type { InlineCommentThreadModel } from '../model/inline-comment-thread';
import type { RefObject } from 'react';

import type { InlineCommentCreateEntrySource } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import { useAuth } from '@/features/auth/model/use-auth';
import { useAddPostCommentAnchorMutation } from '@/shared/api/posts/mutations/use-add-comment-anchor-mutation';
import { isInvalidApiResponseError } from '@/shared/api/response-validation';

import { useInlineCommentDraft } from '../hooks/use-inline-comment-draft';

import InlineCommentInput from './InlineCommentInput';
import InlineCommentThreadContent from './InlineCommentThreadContent';

interface MobileComposerOptions {
	host: HTMLElement | null;
	showAddButton: boolean;
	isActive: boolean;
	shouldFocus: boolean;
	onActivate: () => void;
	onSubmitted: () => void;
}

interface InlineCommentThreadProps {
	thread: InlineCommentThreadModel;
	postId: number;
	onNavigate: (thread: InlineCommentThreadModel) => void;
	isCollapsible?: boolean;
	inputRef?: RefObject<HTMLTextAreaElement | null>;
	entrySource: InlineCommentCreateEntrySource;
	mobileComposer?: MobileComposerOptions;
}

export default function InlineCommentThread({
	thread,
	postId,
	onNavigate,
	isCollapsible = true,
	inputRef,
	entrySource,
	mobileComposer,
}: InlineCommentThreadProps) {
	const { commentText, onCommentChange } = useInlineCommentDraft(thread.anchor.anchorId);

	const { isInitialized, isAuthenticated } = useAuth();
	// UI의 anchorId는 조회 응답 anchorGroups의 selectionId다.
	const mutation = useAddPostCommentAnchorMutation(postId, thread.anchor.anchorId);
	const isResponseUnconfirmed = isInvalidApiResponseError(mutation.error);
	const isSubmitting = useRef(false);
	const handleSubmit = async () => {
		if (!isInitialized || !isAuthenticated || !commentText.trim() || isSubmitting.current) return;
		isSubmitting.current = true;
		try {
			await mutation.mutateAsync({ content: commentText });
			analytics.inlineCommentCreated({ postId, entrySource, commentType: 'reply' });
			onCommentChange('');
			mobileComposer?.onSubmitted();
		} catch {
			// 작성 실패 시 초안을 유지한다.
		} finally {
			isSubmitting.current = false;
		}
	};

	const renderComposer = (isOpen: boolean) => (
		<>
			<InlineCommentInput
				isOpen={isOpen}
				value={commentText}
				onChange={onCommentChange}
				inputRef={inputRef}
				shouldAutoFocus={mobileComposer?.shouldFocus}
				isPending={mutation.isPending}
				onSubmit={() => void handleSubmit()}
			/>
			{mutation.isError && (
				<p role="alert" className="mt-2 text-label-1 text-danger-text">
					{isResponseUnconfirmed
						? '요청 결과를 확인하지 못했습니다. 댓글 목록에서 등록 여부를 확인해 주세요.'
						: '댓글을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.'}
				</p>
			)}
		</>
	);
	return (
		<>
			<InlineCommentThreadContent
				postId={postId}
				anchor={thread.anchor}
				isCollapsible={isCollapsible}
				onNavigate={() => onNavigate(thread)}
				renderInput={mobileComposer === undefined ? renderComposer : undefined}
				onSelectComposer={
					mobileComposer !== undefined && isInitialized && isAuthenticated
						? () => {
								mobileComposer.onActivate();
								if (mobileComposer.isActive) inputRef?.current?.focus({ preventScroll: true });
							}
						: undefined
				}
				isComposerSelected={mobileComposer?.isActive}
				showAddButton={mobileComposer?.showAddButton}
			/>
			{mobileComposer?.isActive &&
				mobileComposer.host !== null &&
				createPortal(renderComposer(true), mobileComposer.host)}
		</>
	);
}
