export interface UploadFormat {
	contentType: string;
	acceptedTypes?: readonly string[];
}

type UploadFormatTable = Readonly<Record<string, UploadFormat>>;

const IMAGE_FORMATS: UploadFormatTable = {
	jpg: { contentType: 'image/jpeg' },
	jpeg: { contentType: 'image/jpeg' },
	png: { contentType: 'image/png' },
	webp: { contentType: 'image/webp' },
	gif: { contentType: 'image/gif' },
	avif: { contentType: 'image/avif' },
	heic: { contentType: 'image/heic', acceptedTypes: ['image/heif'] },
	svg: { contentType: 'image/svg+xml' },
};

const VIDEO_FORMATS: UploadFormatTable = {
	mp4: { contentType: 'video/mp4' },
	webm: { contentType: 'video/webm' },
	mov: { contentType: 'video/quicktime' },
};

const FILE_FORMATS: UploadFormatTable = {
	...IMAGE_FORMATS,
	...VIDEO_FORMATS,
	pdf: { contentType: 'application/pdf' },
	zip: { contentType: 'application/zip' },
	txt: { contentType: 'text/plain' },
	md: { contentType: 'text/markdown', acceptedTypes: ['text/plain'] },
	json: { contentType: 'application/json', acceptedTypes: ['text/plain'] },
	csv: { contentType: 'text/csv', acceptedTypes: ['text/plain', 'application/vnd.ms-excel'] },
};

const FORMATS_BY_CATEGORY = {
	image: IMAGE_FORMATS,
	video: VIDEO_FORMATS,
	file: FILE_FORMATS,
} as const satisfies Record<string, UploadFormatTable>;

type UploadFormatCategory = keyof typeof FORMATS_BY_CATEGORY;

const isUploadFormatCategory = (value: string): value is UploadFormatCategory =>
	Object.hasOwn(FORMATS_BY_CATEGORY, value);

const getFileExtension = (fileName: string): string | null => {
	const dotIndex = fileName.lastIndexOf('.');
	if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
		return null;
	}
	return fileName.slice(dotIndex + 1).toLowerCase();
};

/**
 * 확장자와 MIME 타입이 모두 허용 목록과 일치할 때만 포맷을 돌려준다.
 * category는 업로드 대상 종류(image/video/file)이며, 알 수 없는 값은 허용하지 않는다.
 */
export const getUploadFormat = (file: File, type: string): UploadFormat | null => {
	if (!isUploadFormatCategory(type)) {
		return null;
	}

	const extension = getFileExtension(file.name);
	const formats = FORMATS_BY_CATEGORY[type];
	if (extension === null || !Object.hasOwn(formats, extension)) {
		return null;
	}

	const format = formats[extension];
	if (format === undefined) {
		return null;
	}
	if (file.type !== '' && file.type !== format.contentType && !format.acceptedTypes?.includes(file.type)) {
		return null;
	}
	return format;
};

export const isSupportedImageFile = (file: File): boolean => getUploadFormat(file, 'image') !== null;

export const getUnsupportedFormatMessage = (type: string): string =>
	type === 'image' ? '지원하지 않는 이미지 형식입니다.' : '지원하지 않는 파일 형식입니다.';

export const getUploadFormatError = (file: File, type: string): string | null =>
	getUploadFormat(file, type) === null ? getUnsupportedFormatMessage(type) : null;
