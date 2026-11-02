import { describe, expect, it } from 'vitest';

import { getTransferBlockType } from './insert-upload-block';

describe('getTransferBlockType', () => {
	it.each(['photo.heic', 'icon.svg', 'photo.png'])('MIME 타입이 빈 %s도 이미지 블록으로 분류한다', (name) => {
		expect(getTransferBlockType(new File(['image'], name, { type: '' }))).toBe('image');
	});

	it('이미지 MIME인 지원 불가 형식도 이미지 업로드 검증으로 보낸다', () => {
		expect(getTransferBlockType(new File(['image'], 'photo.bmp', { type: 'image/bmp' }))).toBe('image');
	});

	it('PDF는 파일 블록으로 분류한다', () => {
		expect(getTransferBlockType(new File(['pdf'], 'document.pdf', { type: 'application/pdf' }))).toBe('file');
	});
});
