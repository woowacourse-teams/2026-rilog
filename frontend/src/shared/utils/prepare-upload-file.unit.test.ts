// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MAX_IMAGE_FILE_SIZE_BYTES } from '@/shared/constants/image-upload';

import { prepareImageUploadFile, prepareUploadFile, UploadPreparationError } from './prepare-upload-file';

const { heicToMock } = vi.hoisted(() => ({ heicToMock: vi.fn() }));

vi.mock('heic-to', () => ({
	heicTo: heicToMock,
}));

afterEach(() => {
	heicToMock.mockReset();
});

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

describe('prepareImageUploadFile', () => {
	it('HEIC 이미지는 JPEG로 변환해 확장자와 MIME 타입을 변경한다', async () => {
		heicToMock.mockResolvedValue(new Blob(['jpeg-bytes'], { type: 'image/jpeg' }));
		const heicFile = new File(['heic-bytes'], 'profile.HEIC', { type: 'image/heic' });

		const prepared = await prepareImageUploadFile(heicFile);

		expect(heicToMock).toHaveBeenCalledWith({ blob: heicFile, type: 'image/jpeg', quality: 0.9 });
		expect(prepared.name).toBe('profile.jpg');
		expect(prepared.type).toBe('image/jpeg');
		expect(await prepared.text()).toBe('jpeg-bytes');
	});

	it('GIF는 변환 없이 그대로 통과시킨다', async () => {
		const gifFile = new File(['gif-bytes'], 'anim.gif', { type: 'image/gif' });

		await expect(prepareImageUploadFile(gifFile)).resolves.toBe(gifFile);
	});

	it('MIME 타입이 비어 있으면 확장자 기준으로 보정한다', async () => {
		const pngFile = new File(['png-bytes'], 'photo.png', { type: '' });

		const prepared = await prepareImageUploadFile(pngFile);

		expect(prepared.name).toBe('photo.png');
		expect(prepared.type).toBe('image/png');
	});

	it('SVG는 위험한 요소를 제거한 뒤 image/svg+xml로 반환한다', async () => {
		const svgFile = new File(
			[`<svg xmlns="${SVG_NAMESPACE}"><script>alert(1)</script><rect width="1" height="1"/></svg>`],
			'icon.svg',
			{ type: '' },
		);

		const prepared = await prepareImageUploadFile(svgFile);
		const text = await prepared.text();

		expect(prepared.name).toBe('icon.svg');
		expect(prepared.type).toBe('image/svg+xml');
		expect(text).toContain('<rect');
		expect(text).not.toContain('script');
	});

	it('DOCTYPE이나 ENTITY를 포함한 SVG는 거절한다', async () => {
		const svgFile = new File([`<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="${SVG_NAMESPACE}"></svg>`], 'xxe.svg', {
			type: 'image/svg+xml',
		});

		await expect(prepareImageUploadFile(svgFile)).rejects.toThrowError(
			new UploadPreparationError('SVG 파일을 안전하게 처리할 수 없습니다.'),
		);
	});

	it('지원하지 않는 이미지 확장자면 UploadPreparationError를 던진다', async () => {
		const bmpFile = new File(['bmp-bytes'], 'legacy.bmp', { type: 'image/bmp' });

		await expect(prepareImageUploadFile(bmpFile)).rejects.toThrowError(
			new UploadPreparationError('지원하지 않는 이미지 형식입니다.'),
		);
	});

	it('10MB를 초과하는 HEIC 이미지는 변환 전에 거절한다', async () => {
		const oversizedHeic = new File([new Uint8Array(MAX_IMAGE_FILE_SIZE_BYTES + 1)], 'large.heic', {
			type: 'image/heic',
		});

		await expect(prepareImageUploadFile(oversizedHeic)).rejects.toThrowError(
			new UploadPreparationError('이미지는 최대 10MB까지 업로드할 수 있습니다.'),
		);
		expect(heicToMock).not.toHaveBeenCalled();
	});
});

describe('prepareUploadFile', () => {
	it('이미지가 아닌 파일 블록은 파일 형식 오류 문구를 사용한다', async () => {
		const exeFile = new File(['exe'], 'app.exe', { type: 'application/octet-stream' });

		await expect(prepareUploadFile(exeFile, 'file')).rejects.toThrowError(
			new UploadPreparationError('지원하지 않는 파일 형식입니다.'),
		);
	});

	it('PDF는 변환 없이 그대로 통과시킨다', async () => {
		const pdfFile = new File(['pdf'], 'doc.pdf', { type: 'application/pdf' });

		await expect(prepareUploadFile(pdfFile, 'file')).resolves.toBe(pdfFile);
	});
});
