// @vitest-environment jsdom
import { BlockNoteEditor } from '@blocknote/core';
import { describe, expect, it } from 'vitest';

import { POST_WRITE_SCHEMA } from './post-write-schema';
import { updateMediaUrlWithoutHistory } from './update-media-url-without-history';

describe('updateMediaUrlWithoutHistory', () => {
	it('일반 URL 변경은 별도 undo 단계가 된다', () => {
		const editor = BlockNoteEditor.create({
			schema: POST_WRITE_SCHEMA,
			initialContent: [{ id: 'paragraph-1', type: 'paragraph', content: '본문' }],
		});
		editor.mount(document.createElement('div'));
		try {
			editor.insertBlocks(
				[{ id: 'image-1', type: 'image', props: { url: 'https://external.test/image.png' } }],
				'paragraph-1',
				'after',
			);
			editor.updateBlock('image-1', { props: { url: 'https://images.rilog.test/image.webp' } });
			expect(editor.undo()).toBe(true);
			expect(editor.getBlock('image-1')).toMatchObject({ props: { url: 'https://external.test/image.png' } });
		} finally {
			editor.unmount();
		}
	});

	it('외부 이미지 URL을 교체하며 표시 너비를 저장해도 undo는 이미지 삽입을 취소한다', () => {
		const editor = BlockNoteEditor.create({
			schema: POST_WRITE_SCHEMA,
			initialContent: [{ id: 'paragraph-1', type: 'paragraph', content: '본문' }],
		});
		editor.mount(document.createElement('div'));
		try {
			editor.insertBlocks(
				[{ id: 'image-1', type: 'image', props: { url: 'https://external.test/image.png' } }],
				'paragraph-1',
				'after',
			);
			updateMediaUrlWithoutHistory(editor, 'image-1', 'https://images.rilog.test/image.webp', 420);

			const image = editor.getBlock('image-1');
			expect(image?.type).toBe('image');
			if (image?.type === 'image') {
				expect(image.props.url).toBe('https://images.rilog.test/image.webp');
				expect(image.props.previewWidth).toBe(420);
			}
			expect(editor.undo()).toBe(true);
			expect(editor.getBlock('image-1')).toBeUndefined();
		} finally {
			editor.unmount();
		}
	});
});
