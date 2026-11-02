import { describe, expect, it } from 'vitest';

import type { PostWriteBlockNoteEditor } from './post-write-schema';

import {
	attachImageImportLoading,
	detachImageImportLoading,
	IMAGE_IMPORT_OVERLAY_CLASS,
	IMAGE_IMPORTING_CLASS,
	preloadImage,
} from './image-import-loading';

describe('ImageImportLoading DOM', () => {
	it('DOM에 로딩 오버레이를 추가하고 detach 시 제거한다', () => {
		const domElement = document.createElement('div');
		const blockElement = document.createElement('div');
		blockElement.setAttribute('data-id', 'test-block');
		const mediaWrapper = document.createElement('div');
		mediaWrapper.className = 'bn-visual-media-wrapper';
		blockElement.appendChild(mediaWrapper);
		domElement.appendChild(blockElement);

		const mockEditor = { domElement } as unknown as PostWriteBlockNoteEditor;

		attachImageImportLoading(mockEditor, 'test-block');

		expect(mediaWrapper.classList.contains(IMAGE_IMPORTING_CLASS)).toBe(true);
		const overlay = mediaWrapper.querySelector(`.${IMAGE_IMPORT_OVERLAY_CLASS}`);
		expect(overlay).not.toBeNull();
		expect(overlay?.getAttribute('aria-label')).toBe('이미지 변환 중');

		// 중복 attach 시에도 오버레이는 1개만 유지
		attachImageImportLoading(mockEditor, 'test-block');
		expect(mediaWrapper.querySelectorAll(`.${IMAGE_IMPORT_OVERLAY_CLASS}`).length).toBe(1);

		// detach 시 오버레이와 클래스 모두 제거
		detachImageImportLoading(mockEditor, 'test-block');
		expect(mediaWrapper.classList.contains(IMAGE_IMPORTING_CLASS)).toBe(false);
		expect(mediaWrapper.querySelector(`.${IMAGE_IMPORT_OVERLAY_CLASS}`)).toBeNull();
	});

	it('preloadImage는 URL이 주어지면 안전하게 완료된다', async () => {
		await expect(preloadImage('https://example.com/test.png')).resolves.toBeUndefined();
	});

	it('blockElement가 없어도 에러 없이 안전하게 종료된다', () => {
		const domElement = document.createElement('div');
		const mockEditor = { domElement } as unknown as PostWriteBlockNoteEditor;

		expect(() => attachImageImportLoading(mockEditor, 'non-existent')).not.toThrow();
		expect(() => detachImageImportLoading(mockEditor, 'non-existent')).not.toThrow();
	});
});
