import type { ComponentProps } from 'react';

import FileUploader from '@/shared/ui/file-uploader/FileUploader';

type ImageUploaderProps = Omit<ComponentProps<typeof FileUploader>, 'accept'>;

function isImageFile(file: File) {
	return file.type.startsWith('image/');
}

export default function ImageUploader({
	buttonLabel = '이미지 변경',
	validateFile,
	...fileUploaderProps
}: ImageUploaderProps) {
	return (
		<FileUploader
			{...fileUploaderProps}
			accept="image/*"
			buttonLabel={buttonLabel}
			validateFile={(file) => isImageFile(file) && (validateFile?.(file) ?? true)}
		/>
	);
}
