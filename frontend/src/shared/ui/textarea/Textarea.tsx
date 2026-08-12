'use client';

import { useId } from 'react';

import type { ComponentPropsWithRef } from 'react';

import { getTextLength } from '@/shared/ui/textarea/lib/get-text-length';


type TextareaSize = 'sm' | 'md' | 'lg';
type TextareaStatus = 'default' | 'error' | 'success';

interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
	size?: TextareaSize;
	status?: TextareaStatus;
}

const BASE_TEXTAREA_CLASS_NAME =
	'w-full resize-y rounded-md border bg-white px-4 py-2 text-label-2 text-text-primary placeholder:text-text-placeholder focus-visible:outline-2 focus-visible:-outline-offset-1 disabled:cursor-not-allowed disabled:resize-none disabled:bg-surface disabled:text-text-disabled';

const SIZE_CLASS_NAMES: Record<TextareaSize, string> = {
	sm: 'h-height-md min-h-height-md max-h-height-2xl',
	md: 'h-height-xl min-h-height-xl max-h-height-3xl',
	lg: 'h-height-2xl min-h-height-2xl max-h-height-4xl',
};

const STATUS_CLASS_NAMES: Record<TextareaStatus, string> = {
	default: 'border-border-default',
	error: 'border-danger',
	success: 'border-success',
};

export default function Textarea({
	className,
	defaultValue,
	id,
	ref,
	maxLength,
	value,
	size = 'md',
	status = 'default',
	'aria-describedby': ariaDescribedBy,
	'aria-invalid': ariaInvalid,
	...textareaProps
}: TextareaProps) {
	const generatedId = useId();
	const characterCountId = `${id ?? generatedId}-character-count`;
	const hasCharacterCount = maxLength !== undefined;
	const describedBy = hasCharacterCount
		? [ariaDescribedBy, characterCountId].filter(Boolean).join(' ')
		: ariaDescribedBy;

	const currentLength = value === undefined ? 0 : getTextLength(value);

	return (
		<div className="flex w-full flex-col">
			<textarea
				{...textareaProps}
				ref={ref}
				id={id}
				maxLength={maxLength}
				value={value}
				defaultValue={defaultValue}
				className={`${BASE_TEXTAREA_CLASS_NAME} ${SIZE_CLASS_NAMES[size]} ${STATUS_CLASS_NAMES[status]} ${className ?? ''}`.trim()}
				aria-describedby={describedBy}
				aria-invalid={status === 'error' ? true : ariaInvalid}
			/>
			{hasCharacterCount && (
				<p id={characterCountId} className={`mt-1 text-right text-label-1 text-text-secondary`}>
					{currentLength} / {maxLength}
				</p>
			)}
		</div>
	);
}
