import { MAX_IMAGE_FILE_SIZE_BYTES } from '@/shared/constants/image-upload';
import { getUnsupportedFormatMessage, getUploadFormat, type UploadFormat } from '@/shared/utils/upload-format';

export class UploadPreparationError extends Error {}

const SVG_ERROR_MESSAGE = 'SVG 파일을 안전하게 처리할 수 없습니다.';
const IMAGE_SIZE_ERROR_MESSAGE = '이미지는 최대 10MB까지 업로드할 수 있습니다.';

const normalizeContentType = (file: File, format: UploadFormat): File =>
	file.type === format.contentType ? file : new File([file], file.name, { type: format.contentType });

const convertHeicToJpeg = async (file: File): Promise<File> => {
	if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
		throw new UploadPreparationError(IMAGE_SIZE_ERROR_MESSAGE);
	}

	let converted: Blob;
	try {
		const { heicTo } = await import('heic-to');
		converted = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
	} catch (error) {
		throw new UploadPreparationError('HEIC 이미지를 JPEG로 변환할 수 없습니다.', { cause: error });
	}

	if (converted.size > MAX_IMAGE_FILE_SIZE_BYTES) {
		throw new UploadPreparationError('변환된 이미지는 최대 10MB까지 업로드할 수 있습니다.');
	}
	return new File([converted], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
};

const sanitizeSvg = async (file: File, format: UploadFormat): Promise<File> => {
	if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
		throw new UploadPreparationError(IMAGE_SIZE_ERROR_MESSAGE);
	}

	const source = await file.text();
	if (/<!\s*(?:doctype|entity)\b/i.test(source)) {
		throw new UploadPreparationError(SVG_ERROR_MESSAGE);
	}

	// SVG를 업로드할 때만 필요하므로 공용 API 번들에 포함되지 않도록 지연 로드한다.
	const { default: domPurify } = await import('dompurify');
	const sanitized = domPurify.sanitize(source, {
		USE_PROFILES: { svg: true, svgFilters: true },
		FORBID_TAGS: ['foreignObject', 'script', 'style', 'image', 'use'],
		FORBID_ATTR: ['href', 'xlink:href', 'style'],
	});

	const document = new DOMParser().parseFromString(sanitized, 'image/svg+xml');
	const root = document.documentElement;
	if (
		root.localName !== 'svg' ||
		root.namespaceURI !== 'http://www.w3.org/2000/svg' ||
		document.querySelector('parsererror')
	) {
		throw new UploadPreparationError(SVG_ERROR_MESSAGE);
	}

	for (const element of [root, ...root.querySelectorAll('*')]) {
		for (const attribute of element.attributes) {
			if (/url\s*\(/i.test(attribute.value) && !/^url\s*\(\s*#[\w-]+\s*\)$/i.test(attribute.value)) {
				throw new UploadPreparationError(SVG_ERROR_MESSAGE);
			}
		}
	}

	return new File([new XMLSerializer().serializeToString(root)], file.name, { type: format.contentType });
};

/** 업로드 전에 포맷을 검증하고 HEIC 변환과 SVG 정제 같은 안전 처리를 적용한다. */
export const prepareUploadFile = async (file: File, type: string): Promise<File> => {
	const format = getUploadFormat(file, type);
	if (format === null) {
		throw new UploadPreparationError(getUnsupportedFormatMessage(type));
	}

	switch (format.contentType) {
		case 'image/heic':
			return convertHeicToJpeg(file);
		case 'image/svg+xml':
			return sanitizeSvg(file, format);
		default:
			return normalizeContentType(file, format);
	}
};
