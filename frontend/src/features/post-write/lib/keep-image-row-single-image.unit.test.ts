// @vitest-environment jsdom
import { BlockNoteEditor } from '@blocknote/core';
import { describe, expect, it } from 'vitest';

import { keepImageRowSingleImage } from './keep-image-row-single-image';
import { POST_WRITE_SCHEMA } from './post-write-schema';

const column = (id: string) => ({
	id: `column-${id}`,
	type: 'column' as const,
	props: { width: 1 },
	children: [{ id, type: 'image' as const, props: { url: `https://example.com/${id}.png` } }],
});

const setup = (belowRow: { id: string; type: 'paragraph'; content: string }) => {
	const editor = BlockNoteEditor.create({
		schema: POST_WRITE_SCHEMA,
		initialContent: [{ id: 'row', type: 'columnList', children: [column('left'), column('right')] }, belowRow],
	});
	const host = document.createElement('div');
	document.body.append(host);
	editor.mount(host);
	const cleanup = keepImageRowSingleImage(editor);
	const pressBackspace = () => {
		const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
		editor.domElement?.dispatchEvent(event);
		return event;
	};
	return { editor, cleanup, pressBackspace };
};

const rowColumnChildIds = (editor: BlockNoteEditor<typeof POST_WRITE_SCHEMA.blockSchema>) =>
	editor.document[0]?.children.map((child) => child.children.map((block) => block.id));

describe('keepImageRowSingleImage', () => {
	it('빈 블록에서 Backspace를 누르면 블록을 지우고 마지막 열 이미지에 포커스만 둔다', () => {
		const { editor, cleanup, pressBackspace } = setup({ id: 'empty', type: 'paragraph', content: '' });
		editor.setTextCursorPosition('empty', 'start');

		expect(pressBackspace().defaultPrevented).toBe(true);

		expect(rowColumnChildIds(editor)).toEqual([['left'], ['right']]);
		expect(editor.document.map((block) => block.id)).toEqual(['row']);
		expect(editor.getTextCursorPosition().block.id).toBe('right');
		cleanup();
	});

	it('내용이 있는 블록은 열 안으로 옮기지 않고 그대로 둔다', () => {
		const { editor, cleanup, pressBackspace } = setup({ id: 'text', type: 'paragraph', content: '본문' });
		editor.setTextCursorPosition('text', 'start');

		expect(pressBackspace().defaultPrevented).toBe(true);

		expect(rowColumnChildIds(editor)).toEqual([['left'], ['right']]);
		expect(editor.document.map((block) => block.id)).toEqual(['row', 'text']);
		expect(editor.getTextCursorPosition().block.id).toBe('right');
		cleanup();
	});
});
