// @vitest-environment jsdom
import { BlockNoteEditor } from '@blocknote/core';
import { describe, expect, it } from 'vitest';

import { isBlockNoteDocument } from '@/domains/post/lib/validate-blocknote-document';

import { keepImageRowSingleImage } from './keep-image-row-single-image';
import { POST_WRITE_SCHEMA } from './post-write-schema';

const column = (id: string) => ({
	id: `column-${id}`,
	type: 'column' as const,
	props: { width: 1 },
	children: [{ id, type: 'image' as const, props: { url: `https://example.com/${id}.png` } }],
});

const setup = (
	belowRow: { id: string; type: 'paragraph'; content: string },
	columns = [column('left'), column('right')],
) => {
	const editor = BlockNoteEditor.create({
		schema: POST_WRITE_SCHEMA,
		initialContent: [{ id: 'row', type: 'columnList', children: columns }, belowRow],
	});
	const host = document.createElement('div');
	document.body.append(host);
	editor.mount(host);
	const cleanup = keepImageRowSingleImage(editor);
	const pressKey = (key: 'Backspace' | 'Delete') => {
		const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
		editor.domElement?.dispatchEvent(event);
		return event;
	};
	const pressBackspace = () => pressKey('Backspace');
	const pressDelete = () => pressKey('Delete');
	return { editor, cleanup, pressBackspace, pressDelete };
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

	it('3열 이미지행에서 열 이미지를 삭제하면 빈 블록을 남기지 않고 해당 열만 삭제한다', () => {
		const { editor, cleanup, pressBackspace, pressDelete } = setup({ id: 'text', type: 'paragraph', content: '본문' }, [
			column('left'),
			column('middle'),
			column('right'),
		]);
		editor.setTextCursorPosition('middle');

		expect(pressBackspace().defaultPrevented).toBe(true);

		expect(rowColumnChildIds(editor)).toEqual([['left'], ['right']]);
		expect(editor.getTextCursorPosition().block.id).toBe('left');
		expect(isBlockNoteDocument(JSON.parse(JSON.stringify(editor.document)))).toBe(true);

		expect(editor.undo()).toBe(true);
		expect(rowColumnChildIds(editor)).toEqual([['left'], ['middle'], ['right']]);

		editor.setTextCursorPosition('left');
		expect(pressDelete().defaultPrevented).toBe(true);

		expect(rowColumnChildIds(editor)).toEqual([['middle'], ['right']]);
		expect(editor.getTextCursorPosition().block.id).toBe('middle');
		cleanup();
	});

	it('2열 이미지행에서 열 이미지를 삭제하면 열과 columnList를 함께 정리하고 남은 이미지를 단독 블록으로 되돌린다', () => {
		const { editor, cleanup, pressBackspace } = setup({ id: 'text', type: 'paragraph', content: '본문' });
		editor.setTextCursorPosition('right');

		expect(pressBackspace().defaultPrevented).toBe(true);

		expect(editor.document.map((block) => ({ id: block.id, type: block.type }))).toEqual([
			{ id: 'left', type: 'image' },
			{ id: 'text', type: 'paragraph' },
		]);
		expect(editor.getTextCursorPosition().block.id).toBe('left');
		expect(isBlockNoteDocument(JSON.parse(JSON.stringify(editor.document)))).toBe(true);

		expect(editor.undo()).toBe(true);
		expect(rowColumnChildIds(editor)).toEqual([['left'], ['right']]);
		cleanup();
	});
});
