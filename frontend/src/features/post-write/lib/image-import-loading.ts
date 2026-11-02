import type { PostWriteBlockNoteEditor } from './post-write-schema';

import type { PostContentBlock } from '@/domains/post/model/post-content';

import { isTransientMediaUrl } from './validate-post-media';

export const IMAGE_IMPORTING_CLASS = 'post-write-image-importing';
export const IMAGE_IMPORT_OVERLAY_CLASS = 'post-write-image-import-overlay';

export const preloadImage = (url: string): Promise<void> => {
	if (typeof window === 'undefined' || typeof Image === 'undefined' || process.env.NODE_ENV === 'test') {
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		const img = new Image();
		let settled = false;
		const timer = setTimeout(() => {
			if (!settled) {
				settled = true;
				resolve();
			}
		}, 3000);

		const done = () => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve();
		};

		img.onload = () => {
			if ('decode' in img && typeof img.decode === 'function') {
				img.decode().then(done).catch(done);
			} else {
				done();
			}
		};
		img.onerror = done;
		img.src = url;

		if (img.complete) {
			done();
		}
	});
};

export const isImageBlockPendingImport = (
	block: PostContentBlock,
	isUploadedImageUrl: (url: string) => boolean,
): boolean => {
	if (block.type !== 'image') {
		return false;
	}
	const url = typeof block.props.url === 'string' ? block.props.url.trim() : '';
	if (url === '' || isTransientMediaUrl(url)) {
		return false;
	}
	return !isUploadedImageUrl(url);
};

export const hasPendingImageImports = (
	blocks: PostContentBlock[],
	isUploadedImageUrl: (url: string) => boolean,
): boolean => {
	for (const block of blocks) {
		if (isImageBlockPendingImport(block, isUploadedImageUrl)) {
			return true;
		}
		if (Array.isArray(block.children) && block.children.length > 0) {
			if (hasPendingImageImports(block.children, isUploadedImageUrl)) {
				return true;
			}
		}
	}
	return false;
};

export const attachImageImportLoading = (editor: PostWriteBlockNoteEditor, blockId: string): void => {
	const apply = (attemptsLeft: number) => {
		const blockElement = editor.domElement?.querySelector(`[data-id="${blockId}"]`);
		if (!blockElement) {
			if (attemptsLeft > 0 && typeof window !== 'undefined') {
				window.requestAnimationFrame(() => apply(attemptsLeft - 1));
			}
			return;
		}

		const mediaWrapper =
			blockElement.querySelector<HTMLElement>('.bn-visual-media-wrapper') ??
			blockElement.querySelector<HTMLElement>('.bn-file-block-content-wrapper') ??
			blockElement.querySelector<HTMLElement>('.bn-block-content') ??
			(blockElement as HTMLElement);

		mediaWrapper.classList.add(IMAGE_IMPORTING_CLASS);

		if (!mediaWrapper.querySelector(`.${IMAGE_IMPORT_OVERLAY_CLASS}`)) {
			const overlay = document.createElement('div');
			overlay.className = IMAGE_IMPORT_OVERLAY_CLASS;
			overlay.setAttribute('role', 'status');
			overlay.setAttribute('aria-label', '이미지 변환 중');
			mediaWrapper.appendChild(overlay);
		}
	};

	apply(5);
};

export const detachImageImportLoading = (editor: PostWriteBlockNoteEditor, blockId: string): void => {
	const blockElement = editor.domElement?.querySelector(`[data-id="${blockId}"]`);
	if (!blockElement) return;

	const wrappers = blockElement.querySelectorAll<HTMLElement>(
		`.${IMAGE_IMPORTING_CLASS}, .bn-visual-media-wrapper, .bn-file-block-content-wrapper, .bn-block-content`,
	);
	wrappers.forEach((wrapper) => {
		wrapper.classList.remove(IMAGE_IMPORTING_CLASS);
		wrapper.querySelector(`.${IMAGE_IMPORT_OVERLAY_CLASS}`)?.remove();
	});
	blockElement.classList.remove(IMAGE_IMPORTING_CLASS);
	blockElement.querySelector(`.${IMAGE_IMPORT_OVERLAY_CLASS}`)?.remove();
};
