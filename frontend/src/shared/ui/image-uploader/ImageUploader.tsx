import type { ComponentProps } from 'react';

import FileUploader from '@/shared/ui/file-uploader/FileUploader';
import { isSupportedImageFile } from '@/shared/utils/upload-format';

type ImageUploaderProps = Omit<ComponentProps<typeof FileUploader>, 'accept'>;

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
			validateFile={(file) => isSupportedImageFile(file) && (validateFile?.(file) ?? true)}
		/>
	);
}
