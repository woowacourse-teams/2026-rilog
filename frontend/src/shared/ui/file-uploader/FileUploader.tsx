import { useId } from 'react';

import type { ComponentPropsWithRef } from 'react';

interface FileUploaderProps extends Omit<
	ComponentPropsWithRef<'input'>,
	'children' | 'defaultValue' | 'type' | 'value'
> {
	buttonLabel?: string;
	isPending?: boolean;
	pendingLabel?: string;
	fullWidth?: boolean;
}

const FILE_UPLOADER_CLASS_NAME =
	'cursor-pointer inline-flex items-center justify-center gap-2 h-btn-height-md border border-btn-cancel-border rounded-md bg-btn-cancel text-btn-cancel-foreground hover:bg-btn-cancel-hover active:bg-btn-cancel-active text-label-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 has-disabled:cursor-not-allowed has-disabled:opacity-btn-disabled has-disabled:pointer-events-none';

export default function FileUploader({
	buttonLabel = '파일 선택',
	className,
	disabled = false,
	id,
	isPending = false,
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

	return (
		<div className={`w-full ${className ?? ''}`.trim()}>
			<label htmlFor={inputId} className={`${FILE_UPLOADER_CLASS_NAME} ${fullWidth ? 'w-full' : 'w-44'}`}>
				<span aria-hidden="true">{displayedButtonLabel}</span>
				<input
					{...inputProps}
					ref={ref}
					id={inputId}
					type="file"
					disabled={disabled || isPending}
					className="hidden"
					aria-busy={isPending || undefined}
					aria-describedby={ariaDescribedBy}
					aria-label={ariaLabel ?? displayedButtonLabel}
				/>
			</label>
		</div>
	);
}
