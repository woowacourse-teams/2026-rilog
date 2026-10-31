import { describe, expect, it } from 'vitest';

import type { PostContentBlock } from '@/domains/post/model/post-content';

import { removeEmptyUploadBlocks } from './remove-empty-upload-blocks';
import { isBlockNoteDocument } from './validate-blocknote-document';

const createImage = (id: string, url: string, children: PostContentBlock[] = []): PostContentBlock => ({
	id,
	type: 'image',
	props: {
		backgroundColor: 'default',
		textAlignment: 'left',
		name: id,
		url,
		caption: '',
		showPreview: true,
		previewWidth: 512,
	},
	content: undefined,
	children,
});

const createParagraph = (id: string): PostContentBlock => ({
	id,
	type: 'paragraph',
	props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
	content: [{ type: 'text', text: id, styles: {} }],
	children: [],
});

const createColumn = (id: string, children: PostContentBlock[]): PostContentBlock => ({
	id,
	type: 'column',
	props: { width: 1 },
	content: undefined,
	children,
});

const createColumnList = (id: string, children: PostContentBlock[]): PostContentBlock => ({
	id,
	type: 'columnList',
	props: {},
	content: undefined,
	children,
});

describe('removeEmptyUploadBlocks', () => {
	it('빈 업로드 블록만 있던 열이 정리 후 비어 있으면 제거하고 남은 1개 열은 상위 블록으로 풀어낸다', () => {
		const uploadedImage = createImage('uploaded', 'https://example.com/uploaded.png');
		const paragraph = createParagraph('body');
		const document: PostContentBlock[] = [
			createColumnList('row', [
				createColumn('empty-column', [createImage('pending', '')]),
				createColumn('remaining-column', [uploadedImage, paragraph]),
			]),
		];

		const cleaned = removeEmptyUploadBlocks(document);

		expect(cleaned).toEqual([uploadedImage, paragraph]);
		expect(isBlockNoteDocument(cleaned)).toBe(true);
	});

	it('모든 열의 빈 업로드 블록이 제거되어 남은 열이 0개이면 columnList도 함께 제거한다', () => {
		const paragraph = createParagraph('after-row');
		const document: PostContentBlock[] = [
			createColumnList('row', [
				createColumn('first-column', [createImage('pending-1', '')]),
				createColumn('second-column', [createImage('pending-2', '   ')]),
			]),
			paragraph,
		];

		const cleaned = removeEmptyUploadBlocks(document);

		expect(cleaned).toEqual([paragraph]);
		expect(isBlockNoteDocument(cleaned)).toBe(true);
	});

	it('빈 열 제거 후에도 2개 이상의 열이 남으면 유효한 열만 담은 columnList를 유지한다', () => {
		const firstImage = createImage('first', 'https://example.com/first.png');
		const thirdImage = createImage('third', 'https://example.com/third.png');
		const document: PostContentBlock[] = [
			createColumnList('row', [
				createColumn('first-column', [firstImage]),
				createColumn('empty-column', [createImage('pending', '')]),
				createColumn('third-column', [createImage('pending-in-third', ''), thirdImage]),
			]),
		];

		const cleaned = removeEmptyUploadBlocks(document);

		expect(cleaned).toEqual([
			createColumnList('row', [createColumn('first-column', [firstImage]), createColumn('third-column', [thirdImage])]),
		]);
		expect(isBlockNoteDocument(cleaned)).toBe(true);
	});
});
