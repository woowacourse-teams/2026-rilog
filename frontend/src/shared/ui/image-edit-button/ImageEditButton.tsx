import type { Ref } from 'react';

import ImageUploader from '@/shared/ui/image-uploader/ImageUploader';

interface ImageEditButtonProps {
	imageLabel: string;
	hasImage: boolean;
	onFileChange: (file: File) => void;
	disabled?: boolean;
	required?: boolean;
	inputRef?: Ref<HTMLInputElement>;
	className?: string;
}

export default function ImageEditButton({
	imageLabel,
	hasImage,
	onFileChange,
	disabled = false,
	required = false,
	inputRef,
	className,
}: ImageEditButtonProps) {
	return (
		<ImageUploader
			ref={inputRef}
			required={required}
			disabled={disabled}
			buttonLabel={`${imageLabel} ${hasImage ? '변경' : '추가'}`}
			className={className}
			onFileChange={(file) => {
				if (file !== null) {
					onFileChange(file);
				}
			}}
		/>
	);
}
