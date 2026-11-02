import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { hasPendingImageImports, isImageBlockPendingImport } from './image-import-loading';

describe('image-import-loading', () => {
	describe('isImageBlockPendingImport', () => {
		const isUploadedImageUrl = (url: string) => url.startsWith('https://images.rilog.test/');

		it('image 타입이 아니면 false를 반환한다', () => {
			const block = { type: 'paragraph', props: {} } as unknown as Block;
			expect(isImageBlockPendingImport(block, isUploadedImageUrl)).toBe(false);
		});

		it('image url이 비어있으면 false를 반환한다', () => {
			const block = { type: 'image', props: { url: '' } } as unknown as Block;
			expect(isImageBlockPendingImport(block, isUploadedImageUrl)).toBe(false);
		});

		it('data: 또는 blob: URL(transient url)이면 false를 반환한다', () => {
			const dataBlock = { type: 'image', props: { url: 'data:image/png;base64,...' } } as unknown as Block;
			const blobBlock = { type: 'image', props: { url: 'blob:https://rilog.test/uuid' } } as unknown as Block;
			expect(isImageBlockPendingImport(dataBlock, isUploadedImageUrl)).toBe(false);
			expect(isImageBlockPendingImport(blobBlock, isUploadedImageUrl)).toBe(false);
		});

		it.each(['/images/foo.png', '//example.com/foo.png', 'images/foo.png', 'ftp://example.com/foo.png'])(
			'변환하지 않는 이미지 URL %s가 새 블록에 들어오면 pending으로 표시하지 않는다',
			(url) => {
				const block = { type: 'image', props: { url } } as unknown as Block;
				expect(isImageBlockPendingImport(block, isUploadedImageUrl)).toBe(false);
			},
		);

		it('이미 업로드된 이미지 URL이면 false를 반환한다', () => {
			const block = {
				type: 'image',
				props: { url: 'https://images.rilog.test/photo.webp' },
			} as unknown as Block;
			expect(isImageBlockPendingImport(block, isUploadedImageUrl)).toBe(false);
		});

		it('아직 업로드/임포트되지 않은 외부 이미지 URL이면 true를 반환한다', () => {
			const block = {
				type: 'image',
				props: { url: 'https://external.test/photo.png' },
			} as unknown as Block;
			expect(isImageBlockPendingImport(block, isUploadedImageUrl)).toBe(true);
		});
	});

	describe('hasPendingImageImports', () => {
		const isUploadedImageUrl = (url: string) => url.startsWith('https://images.rilog.test/');

		it('문서 내에 외부 이미지 블록이 없으면 false를 반환한다', () => {
			const blocks = [
				{ type: 'paragraph', content: [], children: [] },
				{ type: 'image', props: { url: 'https://images.rilog.test/img.png' }, children: [] },
			] as unknown as Block[];
			expect(hasPendingImageImports(blocks, isUploadedImageUrl)).toBe(false);
		});

		it('루트 수준에 외부 이미지 블록이 있으면 true를 반환한다', () => {
			const blocks = [
				{ type: 'paragraph', content: [], children: [] },
				{ type: 'image', props: { url: 'https://external.test/img.png' }, children: [] },
			] as unknown as Block[];
			expect(hasPendingImageImports(blocks, isUploadedImageUrl)).toBe(true);
		});

		it('중첩된 자식 블록 내에 외부 이미지 블록이 있으면 true를 반환한다', () => {
			const blocks = [
				{
					type: 'paragraph',
					content: [],
					children: [{ type: 'image', props: { url: 'https://external.test/child.png' }, children: [] }],
				},
			] as unknown as Block[];
			expect(hasPendingImageImports(blocks, isUploadedImageUrl)).toBe(true);
		});

		it('블록이 삭제되어 빈 배열이 되면 false를 반환한다', () => {
			expect(hasPendingImageImports([], isUploadedImageUrl)).toBe(false);
		});
	});
});
