'use client';

import { useLayoutEffect, useRef } from 'react';

import type { RefObject } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import Button from '@/shared/ui/button/Button';
import Textarea from '@/shared/ui/textarea/Textarea';

interface InlineCommentInputProps {
	isOpen: boolean;
	isPending?: boolean;
	onSubmit?: () => void;
	value: string;
	onChange: (value: string) => void;
	inputRef?: RefObject<HTMLTextAreaElement | null>;
}

const resizeTextarea = (element: HTMLTextAreaElement) => {
	element.style.height = 'auto';
	if (element.scrollHeight > 0) {
		const style = getComputedStyle(element);
		const borderHeight = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
		element.style.height = `${element.scrollHeight + borderHeight}px`;
	}
};

export default function InlineCommentInput({
	isOpen,
	value,
	onChange,
	inputRef,
	isPending = false,
	onSubmit,
}: InlineCommentInputProps) {
	const { isAuthenticated, isInitialized } = useAuth();
	const localRef = useRef<HTMLTextAreaElement>(null);
	const textareaRef = inputRef ?? localRef;

	useLayoutEffect(() => {
		if (isOpen && textareaRef.current !== null) {
			resizeTextarea(textareaRef.current);
		}
	}, [isOpen, value, textareaRef]);
	if (!isInitialized || !isAuthenticated) return null;

	return (
		<>
			<Textarea
				ref={textareaRef}
				rows={1}
				value={value}
				disabled={isPending}
				aria-label="댓글 입력"
				placeholder="댓글을 입력하세요."
				style={{
					height: 'auto',
					minHeight: 'calc(1lh + 1rem + 2px)',
					maxHeight: 'calc(20lh + 1rem + 2px)',
					resize: 'none',
					overflowY: 'auto',
				}}
				onChange={(event) => onChange(event.target.value)}
			/>
			<div className="my-2 flex justify-end">
				<Button isPending={isPending} size="sm" disabled={isPending || value.trim().length === 0} onClick={onSubmit}>
					{isPending ? '작성 중…' : '작성'}
				</Button>
			</div>
		</>
	);
}
