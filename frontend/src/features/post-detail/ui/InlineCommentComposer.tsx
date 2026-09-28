'use client';

import { useEffect, useRef } from 'react';

import type { InlineCommentSelectionTarget } from '../model/inline-comment-interaction';
import type { RefObject } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import { isNormalizedApiError } from '@/shared/api/api-error';
import { useCreatePostCommentAnchorMutation } from '@/shared/api/posts/mutations/use-create-comment-anchor-mutation';
import { isInvalidApiResponseError } from '@/shared/api/response-validation';

import { useInlineCommentDraft } from '../hooks/use-inline-comment-draft';

import InlineCommentInput from './InlineCommentInput';
import InlineCommentThreadContent from './InlineCommentThreadContent';

interface InlineCommentComposerProps {
	postId: number;
	onCreated?: (commentAnchorId: number) => void;
	selection: InlineCommentSelectionTarget;
	inputRef: RefObject<HTMLTextAreaElement | null>;
}

export default function InlineCommentComposer({ postId, selection, inputRef, onCreated }: InlineCommentComposerProps) {
	const draftId = `selection:${JSON.stringify([postId, selection.blockId, selection.startOffset, selection.endOffset, selection.selectedText])}`;
	const { commentText, onCommentChange } = useInlineCommentDraft(draftId);

	const { isAuthenticated, isInitialized } = useAuth();
	const mutation = useCreatePostCommentAnchorMutation(postId);
	const isStaleSelection =
		isNormalizedApiError(mutation.error) &&
		(mutation.error.type === 'api' || mutation.error.type === 'http') &&
		mutation.error.response.status === 409;
	const isResponseUnconfirmed = isInvalidApiResponseError(mutation.error);
	const isMounted = useRef(true);
	const isSubmitting = useRef(false);
	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
		};
	}, []);
	const handleSubmit = async () => {
		if (!isAuthenticated || !isInitialized || !commentText.trim() || isSubmitting.current || mutation.isSuccess) return;
		isSubmitting.current = true;
		try {
			const response = await mutation.mutateAsync({ ...selection, content: commentText });
			onCommentChange('');
			if (isMounted.current && response.data) onCreated?.(response.data.commentAnchorId);
		} catch {
			// 오류는 입력 아래 표시하고 초안은 보존한다.
		} finally {
			isSubmitting.current = false;
		}
	};

	return (
		<InlineCommentThreadContent
			postId={postId}
			anchor={{ selectedText: selection.selectedText, state: 'ACTIVE', comments: [] }}
			isCollapsible={false}
			renderInput={(isOpen) => (
				<>
					{!mutation.isSuccess && (
						<InlineCommentInput
							isOpen={isOpen}
							value={commentText}
							onChange={onCommentChange}
							inputRef={inputRef}
							isPending={mutation.isPending}
							onSubmit={() => void handleSubmit()}
						/>
					)}
					{mutation.isError && (
						<p role="alert" className="mt-2 text-label-2 text-danger-text">
							{isResponseUnconfirmed
								? '요청 결과를 확인하지 못했습니다. 댓글 목록에서 등록 여부를 확인해 주세요.'
								: isStaleSelection
									? '본문이 변경되어 댓글을 등록하지 못했습니다. 본문을 새로 확인하고 인용할 부분을 다시 선택해 주세요.'
									: '댓글을 등록하지 못했습니다. 입력한 내용을 확인하고 다시 시도해 주세요.'}
						</p>
					)}
					{mutation.isSuccess && (
						<p role="status" className="mt-2 text-label-2 text-text-secondary">
							댓글을 등록했습니다.
						</p>
					)}
				</>
			)}
		/>
	);
}
