'use client';

import { useLayoutEffect, useRef } from 'react';

import type { RefObject } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import Button from '@/shared/ui/button/Button';
import Textarea from '@/shared/ui/textarea/Textarea';

import { revealInlineCommentInput } from '../lib/reveal-inline-comment-input';

interface InlineCommentInputProps {
	isOpen: boolean;
	shouldAutoFocus?: boolean;
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
	shouldAutoFocus = false,
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
			const textarea = textareaRef.current;
			resizeTextarea(textarea);
			revealInlineCommentInput(textarea);
		}
	}, [isOpen, value, textareaRef]);

	useLayoutEffect(() => {
		if (isOpen && shouldAutoFocus) textareaRef.current?.focus({ preventScroll: true });
	}, [isOpen, shouldAutoFocus, textareaRef]);
	if (!isInitialized || !isAuthenticated) return null;

	return (
		<div data-inline-comment-composer>
			<div role="group" aria-label="댓글 입력 및 작성" className="flex items-end gap-2">
				<div className="min-w-0 flex-1">
					<Textarea
						ref={textareaRef}
						rows={1}
						value={value}
						disabled={isPending}
						aria-label="댓글 입력"
						placeholder="댓글을 입력하세요."
						className="px-3! py-[11px]! text-[16px]! leading-5! md:text-label-1!"
						style={{
							height: 'auto',
							minHeight: '44px',
							maxHeight: 'min(calc(4lh + 24px), var(--comment-input-max-height, calc(4lh + 24px)))',
							resize: 'none',
							overflowY: 'auto',
						}}
						onChange={(event) => onChange(event.target.value)}
					/>
				</div>
				<Button
					isPending={isPending}
					size="sm"
					className="h-11! shrink-0 self-end px-4!"
					disabled={isPending || value.trim().length === 0}
					onClick={onSubmit}
				>
					{isPending ? '작성 중…' : '작성'}
				</Button>
			</div>
		</div>
	);
}
