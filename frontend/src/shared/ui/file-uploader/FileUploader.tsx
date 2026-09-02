'use client';

import { useId } from 'react';

import type { ChangeEvent, ComponentPropsWithRef } from 'react';

interface FileUploaderProps extends Omit<
	ComponentPropsWithRef<'input'>,
	'children' | 'defaultValue' | 'multiple' | 'type' | 'value'
> {
	buttonLabel?: string;
	onFileChange?: (file: File | null) => void;
	onFileRejected?: (file: File) => void;
	validateFile?: (file: File) => boolean;
	isPending?: boolean;
	pendingLabel?: string;
	fullWidth?: boolean;
}

const FILE_UPLOADER_CLASS_NAME =
	'inline-flex items-center justify-center gap-2 h-btn-height-md border border-btn-cancel-border rounded-md bg-btn-cancel text-btn-cancel-foreground hover:bg-btn-cancel-hover active:bg-btn-cancel-active text-label-2 font-semibold transition-colors focus-within:outline-2 focus-within:outline-focus-ring focus-within:-outline-offset-2 has-disabled:cursor-not-allowed has-disabled:opacity-btn-disabled has-disabled:pointer-events-none';

export default function FileUploader({
	buttonLabel = '파일 선택',
	className,
	disabled = false,
	id,
	isPending = false,
	onChange,
	onFileChange,
	onFileRejected,
	validateFile,
	pendingLabel = '업로드 중',
	fullWidth = false,
	ref,
	'aria-describedby': ariaDescribedBy,
	'aria-label': ariaLabel,
	...inputProps
}: FileUploaderProps) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const displayedButtonLabel = isPending ? pendingLabel : buttonLabel;

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.currentTarget.files?.[0] ?? null;

		if (file && validateFile && !validateFile(file)) {
			event.currentTarget.value = '';
			onFileRejected?.(file);
			onChange?.(event);
			return;
		}

		onFileChange?.(file);
		onChange?.(event);
	}

	return (
		<div className={`w-full`.trim()}>
			<label
				htmlFor={inputId}
				className={`${FILE_UPLOADER_CLASS_NAME} ${className ?? ''} ${fullWidth ? 'w-full' : 'w-44'}`}
			>
				<span aria-hidden="true">{displayedButtonLabel}</span>
				<input
					{...inputProps}
					ref={ref}
					id={inputId}
					type="file"
					multiple={false}
					disabled={disabled || isPending}
					onChange={handleChange}
					className="sr-only"
					aria-busy={isPending || undefined}
					aria-describedby={ariaDescribedBy}
					aria-label={ariaLabel ?? displayedButtonLabel}
				/>
			</label>
		</div>
	);
}
