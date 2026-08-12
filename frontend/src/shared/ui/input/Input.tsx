import { useId } from 'react';

import type { ComponentPropsWithRef, ReactNode } from 'react';

type InputStatus = 'default' | 'error' | 'success';

interface InputProps extends ComponentPropsWithRef<'input'> {
	helperText?: ReactNode;
	status?: InputStatus;
}

const BASE_INPUT_CLASS_NAME =
	'h-btn-height-md w-full rounded-md border bg-white px-4 text-label-2 text-text-primary transition-colors placeholder:text-text-placeholder focus-visible:outline-2 focus-visible:-outline-offset-1 disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-disabled';

const STATUS_CLASS_NAMES: Record<InputStatus, string> = {
	default: 'border-border-default',
	error: 'border-danger',
	success: 'border-success',
};

const HELPER_TEXT_CLASS_NAMES: Record<InputStatus, string> = {
	default: 'text-text-secondary',
	error: 'text-danger',
	success: 'text-success',
};

export default function Input({
	className,
	helperText,
	id,
	ref,
	status = 'default',
	'aria-describedby': ariaDescribedBy,
	'aria-invalid': ariaInvalid,
	...inputProps
}: InputProps) {
	const generatedId = useId();
	const helperTextId = `${id ?? generatedId}-helper-text`;
	const describedBy = helperText ? [ariaDescribedBy, helperTextId].filter(Boolean).join(' ') : ariaDescribedBy;

	return (
		<div className="w-full">
			<input
				{...inputProps}
				ref={ref}
				id={id}
				className={`${BASE_INPUT_CLASS_NAME} ${STATUS_CLASS_NAMES[status]} ${className ?? ''}`.trim()}
				aria-describedby={describedBy}
				aria-invalid={status === 'error' ? true : ariaInvalid}
			/>
			{helperText && (
				<p id={helperTextId} className={`mt-1 text-label-1 ${HELPER_TEXT_CLASS_NAMES[status]}`}>
					{helperText}
				</p>
			)}
		</div>
	);
}
