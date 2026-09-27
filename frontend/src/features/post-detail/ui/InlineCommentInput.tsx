'use client';

import { useLayoutEffect, useRef } from 'react';

import type { RefObject } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import Button from '@/shared/ui/button/Button';
import Textarea from '@/shared/ui/textarea/Textarea';

interface InlineCommentInputProps {
	isOpen: boolean;
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

export default function InlineCommentInput({ isOpen, value, onChange, inputRef }: InlineCommentInputProps) {
	const { isAuthenticated, isInitialized } = useAuth();
	const isDisabled = !isInitialized || !isAuthenticated;
	const localRef = useRef<HTMLTextAreaElement>(null);
	const textareaRef = inputRef ?? localRef;

	useLayoutEffect(() => {
		if (isOpen && textareaRef.current !== null) {
			resizeTextarea(textareaRef.current);
		}
	}, [isOpen, value, textareaRef]);

	return (
		<>
			<Textarea
				ref={textareaRef}
				rows={1}
				value={value}
				disabled={isDisabled}
				aria-label="댓글 입력"
				placeholder={isDisabled ? '로그인하고 댓글을 남겨보세요.' : '댓글을 입력하세요.'}
				style={{
					height: 'auto',
					minHeight: 'calc(1lh + 1rem + 2px)',
					maxHeight: 'calc(20lh + 1rem + 2px)',
					resize: 'none',
					overflowY: 'auto',
				}}
				onChange={(event) => onChange(event.target.value)}
			/>
			<div className="mt-2 flex justify-end">
				<Button size="sm" disabled={isDisabled || value.trim().length === 0}>
					작성
				</Button>
			</div>
		</>
	);
}
