import { describe, expect, it } from 'vitest';

import { getUploadFormat, getUploadFormatError, isSupportedImageFile } from './upload-format';

describe('isSupportedImageFile', () => {
	it.each([
		['photo.jpg', 'image/jpeg'],
		['photo.JPEG', 'image/jpeg'],
		['photo.png', 'image/png'],
		['photo.webp', 'image/webp'],
		['photo.gif', 'image/gif'],
		['photo.avif', 'image/avif'],
		['photo.heic', 'image/heic'],
		['photo.heic', 'image/heif'],
		['photo.heic', ''],
		['photo.svg', 'image/svg+xml'],
	])('허용된 확장자와 MIME 조합(%s, %s)은 통과시킨다', (fileName, type) => {
		expect(isSupportedImageFile(new File(['image'], fileName, { type }))).toBe(true);
	});

	it.each([
		['photo.bmp', 'image/bmp'],
		['photo.tiff', 'image/tiff'],
		['photo.ico', 'image/x-icon'],
		['photo.txt', 'text/plain'],
		['photo.png', 'image/bmp'],
		['photo.bmp', 'image/png'],
		['png', 'image/png'],
		['photo.constructor', ''],
		['photo.__proto__', ''],
		['photo.toString', ''],
	])('허용되지 않은 확장자나 불일치하는 MIME 조합(%s, %s)은 거절한다', (fileName, type) => {
		expect(isSupportedImageFile(new File(['image'], fileName, { type }))).toBe(false);
	});
});

describe('getUploadFormat & getUploadFormatError', () => {
	it('비디오와 일반 파일 포맷을 블록 타입별로 구분해 검증한다', () => {
		const mp4File = new File(['video'], 'clip.mp4', { type: 'video/mp4' });
		const pdfFile = new File(['pdf'], 'doc.pdf', { type: 'application/pdf' });

		expect(getUploadFormat(mp4File, 'video')).toEqual({ contentType: 'video/mp4' });
		expect(getUploadFormat(mp4File, 'image')).toBeNull();
		expect(getUploadFormat(pdfFile, 'file')).toEqual({ contentType: 'application/pdf' });
		expect(getUploadFormat(pdfFile, 'paragraph')).toBeNull();
		expect(getUploadFormat(pdfFile, 'constructor')).toBeNull();
		expect(getUploadFormatError(pdfFile, 'image')).toBe('지원하지 않는 이미지 형식입니다.');
		expect(getUploadFormatError(new File(['exe'], 'app.exe', { type: 'application/octet-stream' }), 'file')).toBe(
			'지원하지 않는 파일 형식입니다.',
		);
	});
});
