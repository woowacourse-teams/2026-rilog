interface UploadFormat {
	contentType: string;
	acceptedTypes?: readonly string[];
}

const IMAGE_FORMATS: Record<string, UploadFormat> = {
	jpg: { contentType: 'image/jpeg' },
	jpeg: { contentType: 'image/jpeg' },
	png: { contentType: 'image/png' },
	webp: { contentType: 'image/webp' },
	gif: { contentType: 'image/gif' },
	avif: { contentType: 'image/avif' },
	heic: { contentType: 'image/heic', acceptedTypes: ['image/heif'] },
	svg: { contentType: 'image/svg+xml' },
};

const VIDEO_FORMATS: Record<string, UploadFormat> = {
	mp4: { contentType: 'video/mp4' },
	webm: { contentType: 'video/webm' },
	mov: { contentType: 'video/quicktime' },
};

const FILE_FORMATS: Record<string, UploadFormat> = {
	...IMAGE_FORMATS,
	...VIDEO_FORMATS,
	pdf: { contentType: 'application/pdf' },
	zip: { contentType: 'application/zip' },
	txt: { contentType: 'text/plain' },
	md: { contentType: 'text/markdown', acceptedTypes: ['text/plain'] },
	json: { contentType: 'application/json', acceptedTypes: ['text/plain'] },
	csv: { contentType: 'text/csv', acceptedTypes: ['text/plain', 'application/vnd.ms-excel'] },
};

export const getUploadFormat = (file: File, blockType: string): UploadFormat | null => {
	const extension = file.name.split('.').pop()?.toLowerCase();
	if (extension === undefined) {
		return null;
	}
	const formats =
		blockType === 'image'
			? IMAGE_FORMATS
			: blockType === 'video'
				? VIDEO_FORMATS
				: blockType === 'file'
					? FILE_FORMATS
					: null;
	const format = formats?.[extension];
	if (
		format === undefined ||
		(file.type !== '' && file.type !== format.contentType && !format.acceptedTypes?.includes(file.type))
	) {
		return null;
	}
	return format;
};

export const getUploadFormatError = (file: File, blockType: string): string | null => {
	if (getUploadFormat(file, blockType) !== null) {
		return null;
	}
	return blockType === 'image' ? '지원하지 않는 이미지 형식입니다.' : '지원하지 않는 파일 형식입니다.';
};
