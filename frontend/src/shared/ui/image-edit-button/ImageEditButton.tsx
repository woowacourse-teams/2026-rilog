import type { Ref } from 'react';

import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';

interface ImageEditButtonProps {
	imageLabel: string;
	hasImage: boolean;
	onFileChange: (file: File) => void;
	onFileRejected?: (file: File) => void;
	validateFile?: (file: File) => boolean;
	disabled?: boolean;
	required?: boolean;
	id?: string;
	inputRef?: Ref<HTMLInputElement>;
	className?: string;
	fullWidth?: boolean;
	'aria-describedby'?: string;
	'aria-invalid'?: boolean;
}

export default function ImageEditButton({
	imageLabel,
	hasImage,
	onFileChange,
	onFileRejected,
	validateFile,
	disabled = false,
	required = false,
	id,
	inputRef,
	className,
	fullWidth = false,
	'aria-describedby': ariaDescribedBy,
	'aria-invalid': ariaInvalid,
}: ImageEditButtonProps) {
	return (
		<ImageUploader
			ref={inputRef}
			id={id}
			required={required}
			disabled={disabled}
			buttonLabel={`${imageLabel} ${hasImage ? '변경' : '추가'}`}
			className={className}
			fullWidth={fullWidth}
			onChange={(event) => {
				event.currentTarget.value = '';
			}}
			aria-describedby={ariaDescribedBy}
			aria-invalid={ariaInvalid}
			validateFile={validateFile}
			onFileRejected={onFileRejected}
			onFileChange={(file) => {
				if (file !== null) {
					onFileChange(file);
				}
			}}
		/>
	);
}
