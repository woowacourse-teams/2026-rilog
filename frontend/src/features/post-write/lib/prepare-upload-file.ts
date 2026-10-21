import DOMPurify from 'dompurify';

import { MAX_IMAGE_FILE_SIZE_BYTES } from '@/shared/constants/image-upload';

import { getUploadFormat } from './get-upload-format-error';

export class UploadPreparationError extends Error {}

export const prepareUploadFile = async (file: File, blockType: string): Promise<File> => {
	const format = getUploadFormat(file, blockType);
	if (format === null) {
		throw new UploadPreparationError(
			blockType === 'image' ? '지원하지 않는 이미지 형식입니다.' : '지원하지 않는 파일 형식입니다.',
		);
	}

	if (format.contentType === 'image/heic') {
		if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
			throw new UploadPreparationError('이미지는 최대 10MB까지 업로드할 수 있습니다.');
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
	}

	if (format.contentType !== 'image/svg+xml') {
		return file.type === format.contentType ? file : new File([file], file.name, { type: format.contentType });
	}
	if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
		throw new UploadPreparationError('이미지는 최대 10MB까지 업로드할 수 있습니다.');
	}

	const source = await file.text();
	if (/<!\s*(?:doctype|entity)\b/i.test(source)) {
		throw new UploadPreparationError('SVG 파일을 안전하게 처리할 수 없습니다.');
	}

	const sanitized = DOMPurify.sanitize(source, {
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
		throw new UploadPreparationError('SVG 파일을 안전하게 처리할 수 없습니다.');
	}

	for (const element of [root, ...root.querySelectorAll('*')]) {
		for (const attribute of element.attributes) {
			if (/url\s*\(/i.test(attribute.value) && !/^url\s*\(\s*#[\w-]+\s*\)$/i.test(attribute.value)) {
				throw new UploadPreparationError('SVG 파일을 안전하게 처리할 수 없습니다.');
			}
		}
	}

	return new File([new XMLSerializer().serializeToString(root)], file.name, { type: format.contentType });
};
