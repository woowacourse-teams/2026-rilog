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
	inputRef?: Ref<HTMLInputElement>;
	className?: string;
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
	inputRef,
	className,
	'aria-describedby': ariaDescribedBy,
	'aria-invalid': ariaInvalid,
}: ImageEditButtonProps) {
	return (
		<ImageUploader
			ref={inputRef}
			required={required}
			disabled={disabled}
			buttonLabel={`${imageLabel} ${hasImage ? '변경' : '추가'}`}
			className={className}
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
