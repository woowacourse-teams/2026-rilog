'use client';

import { useEffect, useRef, useState } from 'react';

import { useUpdatePostCommentAnchorMutation } from '@/shared/api/posts/mutations/use-update-comment-anchor-mutation';
import { analytics } from '@/features/analytics/model/events';
import { isInvalidApiResponseError } from '@/shared/api/response-validation';
import Button from '@/shared/ui/button/Button';
import AlertModal from '@/shared/ui/modal/AlertModal';
import Textarea from '@/shared/ui/textarea/Textarea';

interface InlineCommentEditFormProps {
	postId: number;
	commentAnchorId: number;
	onSaved: () => void;
	content: string;
	onCancel: () => void;
}

export default function InlineCommentEditForm({
	content,
	onCancel,
	postId,
	commentAnchorId,
	onSaved,
}: InlineCommentEditFormProps) {
	const mutation = useUpdatePostCommentAnchorMutation(postId, commentAnchorId);
	const isResponseUnconfirmed = isInvalidApiResponseError(mutation.error);
	const [isErrorOpen, setIsErrorOpen] = useState(false);
	const [value, setValue] = useState(content);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const isSubmitting = useRef(false);
	const handleSubmit = async () => {
		if (!value.trim() || isSubmitting.current) return;
		isSubmitting.current = true;
		try {
			await mutation.mutateAsync({ content: value });
			analytics.inlineCommentUpdated({ postId });
			onSaved();
		} catch {
			setIsErrorOpen(true);
		} finally {
			isSubmitting.current = false;
		}
	};

	useEffect(() => {
		const input = inputRef.current;
		input?.focus();
		input?.setSelectionRange(input.value.length, input.value.length);
	}, []);

	return (
		<>
			<Textarea
				ref={inputRef}
				aria-label="댓글 수정"
				rows={1}
				readOnly={mutation.isPending}
				value={value}
				onChange={(event) => setValue(event.target.value)}
				style={{
					fieldSizing: 'content',
					height: 'auto',
					minHeight: 'calc(1lh + 1rem + 2px)',
					maxHeight: 'calc(20lh + 1rem + 2px)',
					resize: 'none',
					overflowY: 'auto',
				}}
			/>
			<div className="mt-2 flex justify-end gap-2">
				<Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={onCancel}>
					취소
				</Button>

				<Button size="sm" isPending={mutation.isPending} disabled={!value.trim()} onClick={() => void handleSubmit()}>
					{mutation.isPending ? '저장 중…' : '저장'}
				</Button>
			</div>
			<AlertModal
				open={isErrorOpen}
				title={isResponseUnconfirmed ? '수정 결과를 확인하지 못했습니다.' : '댓글을 수정하지 못했습니다.'}
				description={isResponseUnconfirmed ? '댓글 목록에서 수정 여부를 확인해 주세요.' : '잠시 후 다시 시도해 주세요.'}
				onAction={() => setIsErrorOpen(false)}
				onClose={() => setIsErrorOpen(false)}
			/>
		</>
	);
}
