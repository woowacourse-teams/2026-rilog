// @vitest-environment jsdom
import { BlockNoteEditor } from '@blocknote/core';
import { describe, expect, it } from 'vitest';

import type { DragSource, DropDirection } from './image-row-drop-policy';

import { isBlockNoteDocument } from '@/domains/post/lib/validate-blocknote-document';

import { applyImageRowDrop, classifyDragSource, getImageRowAddAction } from './image-row';
import { POST_WRITE_SCHEMA } from './post-write-schema';

const image = (id: string) => ({
	id,
	type: 'image' as const,
	props: { url: `https://example.com/${id}.png`, name: id, caption: `${id} 설명` },
});

const createEditor = () => {
	const editor = BlockNoteEditor.create({
		schema: POST_WRITE_SCHEMA,
		initialContent: [
			image('one'),
			{ id: 'text', type: 'paragraph', content: '본문' },
			image('two'),
			image('three'),
			image('four'),
		],
	});
	editor.mount(document.createElement('div'));
	return editor;
};

type TestEditor = ReturnType<typeof createEditor>;

const standalone = (blockId: string): DragSource => ({ kind: 'standalone-image', blockId });
const drop = (editor: TestEditor, source: DragSource, targetId: string, direction: DropDirection) =>
	applyImageRowDrop(editor, source, { targetId, direction, insertIndex: 0 });

const layoutOf = (editor: TestEditor) =>
	editor.document.map((block) =>
		block.type === 'columnList' ? block.children.map((column) => column.children[0]?.id) : block.id,
	);

const withEditor = (run: (editor: TestEditor) => void) => {
	const editor = createEditor();
	try {
		run(editor);
	} finally {
		editor.unmount();
	}
};

describe('applyImageRowDrop 좌우', () => {
	it.each([
		{ direction: 'left', order: ['one', 'two'] },
		{ direction: 'right', order: ['two', 'one'] },
	] as const)(
		'단독 이미지 %s에 놓으면 소스가 앞/뒤인 2장 행을 만들고 undo 한 번으로 되돌린다',
		({ direction, order }) =>
			withEditor((editor) => {
				expect(drop(editor, standalone('one'), 'two', direction)).toBe(true);
				expect(layoutOf(editor)).toEqual(['text', order, 'three', 'four']);
				const row = editor.document.find((block) => block.type === 'columnList');
				expect(row?.children.every((column) => column.children.length === 1)).toBe(true);
				expect(isBlockNoteDocument(JSON.parse(JSON.stringify(editor.document)))).toBe(true);
				expect(editor.undo()).toBe(true);
				expect(layoutOf(editor)).toEqual(['one', 'text', 'two', 'three', 'four']);
				expect(editor.redo()).toBe(true);
				expect(layoutOf(editor)).toEqual(['text', order, 'three', 'four']);
			}),
	);

	it('2장 행의 열 이미지 앞/뒤에 세 번째 이미지를 삽입하고 4장째는 거부한다', () =>
		withEditor((editor) => {
			expect(drop(editor, standalone('one'), 'two', 'right')).toBe(true);
			expect(drop(editor, standalone('three'), 'two', 'left')).toBe(true);
			expect(layoutOf(editor)).toEqual(['text', ['three', 'two', 'one'], 'four']);
			expect(drop(editor, standalone('four'), 'one', 'right')).toBe(false);
			expect(drop(editor, standalone('four'), 'three', 'left')).toBe(false);
			expect(layoutOf(editor)).toEqual(['text', ['three', 'two', 'one'], 'four']);
		}));

	it('같은 행 안에서는 3장이어도 순서를 바꾸고 제자리는 문서를 바꾸지 않는다', () =>
		withEditor((editor) => {
			drop(editor, standalone('one'), 'two', 'right');
			drop(editor, standalone('three'), 'two', 'left');
			const column = (blockId: string): DragSource => ({
				kind: 'column-image',
				blockId,
				rowId: editor.document.find((block) => block.type === 'columnList')?.id ?? '',
			});
			expect(drop(editor, column('three'), 'one', 'right')).toBe(true);
			expect(layoutOf(editor)[1]).toEqual(['two', 'one', 'three']);
			expect(drop(editor, column('two'), 'one', 'left')).toBe(false);
			expect(drop(editor, column('three'), 'one', 'right')).toBe(false);
			expect(drop(editor, column('one'), 'two', 'left')).toBe(true);
			expect(layoutOf(editor)[1]).toEqual(['one', 'two', 'three']);
		}));

	it('다른 행의 열 이미지를 옮기면 원래 2장 행은 단독 이미지로 풀린다', () =>
		withEditor((editor) => {
			drop(editor, standalone('one'), 'two', 'right');
			drop(editor, standalone('three'), 'four', 'right');
			const rows = editor.document.filter((block) => block.type === 'columnList');
			const source: DragSource = { kind: 'column-image', blockId: 'four', rowId: rows[1].id };
			expect(drop(editor, source, 'two', 'right')).toBe(true);
			expect(layoutOf(editor)).toEqual(['text', ['two', 'four', 'one'], 'three']);
			expect(editor.undo()).toBe(true);
			expect(layoutOf(editor)).toEqual(['text', ['two', 'one'], ['four', 'three']]);
		}));

	it('열 이미지를 단독 이미지 옆에 놓으면 새 행을 만들고 원래 행은 풀린다', () =>
		withEditor((editor) => {
			drop(editor, standalone('one'), 'two', 'right');
			const row = editor.document.find((block) => block.type === 'columnList');
			const source: DragSource = { kind: 'column-image', blockId: 'two', rowId: row?.id ?? '' };
			expect(drop(editor, source, 'three', 'left')).toBe(true);
			expect(layoutOf(editor)).toEqual(['text', 'one', ['two', 'three'], 'four']);
		}));

	it('그 외 블록과 다중 선택, 자기 자신은 좌우로 놓지 못한다', () =>
		withEditor((editor) => {
			expect(drop(editor, { kind: 'other', blockId: 'text' }, 'two', 'left')).toBe(false);
			expect(drop(editor, { kind: 'multi', blockIds: ['one', 'two'] }, 'three', 'left')).toBe(false);
			expect(drop(editor, standalone('one'), 'one', 'left')).toBe(false);
			expect(layoutOf(editor)).toEqual(['one', 'text', 'two', 'three', 'four']);
		}));
});

describe('applyImageRowDrop 상하', () => {
	it('그 외 블록과 다중 선택을 상하로 옮긴다', () =>
		withEditor((editor) => {
			expect(drop(editor, { kind: 'other', blockId: 'text' }, 'four', 'bottom')).toBe(true);
			expect(layoutOf(editor)).toEqual(['one', 'two', 'three', 'four', 'text']);
			expect(drop(editor, { kind: 'multi', blockIds: ['two', 'three'] }, 'one', 'top')).toBe(true);
			expect(layoutOf(editor)).toEqual(['two', 'three', 'one', 'four', 'text']);
		}));

	it('3장 행에서 이미지를 꺼내면 2장 행이 남고, 2장 행에서 꺼내면 남은 이미지가 단독으로 돌아온다', () =>
		withEditor((editor) => {
			drop(editor, standalone('one'), 'two', 'right');
			drop(editor, standalone('three'), 'two', 'left');
			const rowId = editor.document.find((block) => block.type === 'columnList')?.id ?? '';
			const pull = (blockId: string, targetId: string, direction: DropDirection) =>
				drop(editor, { kind: 'column-image', blockId, rowId }, targetId, direction);
			expect(pull('two', 'text', 'top')).toBe(true);
			expect(layoutOf(editor)).toEqual(['two', 'text', ['three', 'one'], 'four']);
			expect(editor.undo()).toBe(true);
			expect(layoutOf(editor)).toEqual(['text', ['three', 'two', 'one'], 'four']);
			editor.redo();

			const rest = editor.document.find((block) => block.type === 'columnList')?.id ?? '';
			expect(drop(editor, { kind: 'column-image', blockId: 'three', rowId: rest }, 'four', 'bottom')).toBe(true);
			expect(layoutOf(editor)).toEqual(['two', 'text', 'one', 'four', 'three']);
		}));

	it('자기 2장 행의 위로 놓으면 행이 풀리며 소스가 남은 이미지 앞에 놓인다', () =>
		withEditor((editor) => {
			drop(editor, standalone('one'), 'two', 'right');
			const row = editor.document.find((block) => block.type === 'columnList');
			const source: DragSource = { kind: 'column-image', blockId: 'one', rowId: row?.id ?? '' };
			expect(drop(editor, source, row?.id ?? '', 'bottom')).toBe(true);
			expect(layoutOf(editor)).toEqual(['text', 'two', 'one', 'three', 'four']);
		}));
});

describe('classifyDragSource', () => {
	it('블록 종류별 소스 종류를 구분한다', () =>
		withEditor((editor) => {
			expect(classifyDragSource(editor, ['one'])).toEqual({ kind: 'standalone-image', blockId: 'one' });
			expect(classifyDragSource(editor, ['text'])).toEqual({ kind: 'other', blockId: 'text' });
			expect(classifyDragSource(editor, ['one', 'two'])).toEqual({ kind: 'multi', blockIds: ['one', 'two'] });
			drop(editor, standalone('one'), 'two', 'right');
			const row = editor.document.find((block) => block.type === 'columnList');
			expect(classifyDragSource(editor, ['two'])).toEqual({
				kind: 'column-image',
				blockId: 'two',
				rowId: row?.id,
			});
		}));

	it('이미지행 전체와 행 안 이미지의 다중 선택은 드래그 시작을 막는다', () =>
		withEditor((editor) => {
			drop(editor, standalone('one'), 'two', 'right');
			const row = editor.document.find((block) => block.type === 'columnList');
			expect(classifyDragSource(editor, [row?.id ?? ''])).toBeNull();
			expect(classifyDragSource(editor, [row?.children[0].id ?? ''])).toBeNull();
			expect(classifyDragSource(editor, ['one', 'two'])).toBeNull();
			expect(classifyDragSource(editor, ['text', 'one'])).toBeNull();
			expect(classifyDragSource(editor, ['text', 'three'])).toEqual({
				kind: 'multi',
				blockIds: ['text', 'three'],
			});
			expect(classifyDragSource(editor, [])).toBeNull();
		}));

	it('업로드되지 않은 이미지는 가로 배치에 참여하지 않는 일반 블록이다', () =>
		withEditor((editor) => {
			editor.insertBlocks([{ id: 'empty', type: 'image', props: { url: '' } }], 'one', 'before');
			expect(classifyDragSource(editor, ['empty'])).toEqual({ kind: 'other', blockId: 'empty' });
		}));
});

describe('getImageRowAddAction', () => {
	it('이미지 행의 첫 열에서는 행 아래에 블록을 추가하고 다른 열에서는 추가 버튼을 숨긴다', () =>
		withEditor((editor) => {
			drop(editor, standalone('one'), 'two', 'left');
			drop(editor, standalone('three'), 'two', 'right');
			const rowId = editor.document.find((block) => block.type === 'columnList')?.id;
			expect(getImageRowAddAction(editor, 'one')).toEqual({ kind: 'after-row', rowId });
			expect(getImageRowAddAction(editor, 'two')).toEqual({ kind: 'hidden' });
			expect(getImageRowAddAction(editor, 'three')).toEqual({ kind: 'hidden' });
			expect(getImageRowAddAction(editor, 'text')).toEqual({ kind: 'default' });
		}));
});
