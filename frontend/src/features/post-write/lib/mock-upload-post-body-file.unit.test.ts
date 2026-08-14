import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockUploadPostBodyFile } from './mock-upload-post-body-file';

class SuccessfulFileReader {
	result: string | ArrayBuffer | null = null;

	addEventListener(type: string, listener: () => void) {
		if (type === 'load') {
			this.result = 'data:image/png;base64,bW9jaw==';
			listener();
		}
	}

	readAsDataURL() {}
}

class FailedFileReader {
	error = new DOMException('read failed');
	result: string | ArrayBuffer | null = null;

	addEventListener(type: string, listener: () => void) {
		if (type === 'error') {
			listener();
		}
	}

	readAsDataURL() {}
}

describe('mockUploadPostBodyFile', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('이미지 파일을 data URL로 변환한다', async () => {
		vi.stubGlobal('FileReader', SuccessfulFileReader);

		await expect(mockUploadPostBodyFile(new File(['mock'], 'image.png', { type: 'image/png' }))).resolves.toBe(
			'data:image/png;base64,bW9jaw==',
		);
	});

	it('파일을 읽지 못하면 오류를 전달한다', async () => {
		vi.stubGlobal('FileReader', FailedFileReader);

		await expect(mockUploadPostBodyFile(new File(['mock'], 'image.png', { type: 'image/png' }))).rejects.toThrow(
			'read failed',
		);
	});
});
