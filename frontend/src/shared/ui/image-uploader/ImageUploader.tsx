import type { ComponentProps } from 'react';

import FileUploader from '@/shared/ui/file-uploader/FileUploader';

type ImageUploaderProps = Omit<ComponentProps<typeof FileUploader>, 'accept' | 'validateFile'>;

function isImageFile(file: File) {
	return file.type.startsWith('image/');
}

export default function ImageUploader({ buttonLabel = '이미지 변경', ...fileUploaderProps }: ImageUploaderProps) {
	return <FileUploader {...fileUploaderProps} accept="image/*" buttonLabel={buttonLabel} validateFile={isImageFile} />;
}
