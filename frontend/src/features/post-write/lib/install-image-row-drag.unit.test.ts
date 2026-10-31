// @vitest-environment jsdom
import { BlockNoteEditor } from '@blocknote/core';
import { SideMenuExtension } from '@blocknote/core/extensions';
import { describe, expect, it, vi } from 'vitest';

import { applyImageRowDrop } from './image-row';
import { installImageRowDrag } from './install-image-row-drag';
import { POST_WRITE_SCHEMA } from './post-write-schema';

const dragEvent = (type: string, clientX = 0, clientY = 0): DragEvent => {
	const event = new Event(type, { bubbles: true, cancelable: true });
	Object.defineProperty(event, 'clientX', { value: clientX });
	Object.defineProperty(event, 'clientY', { value: clientY });
	Object.defineProperty(event, 'relatedTarget', { value: null });
	Object.defineProperty(event, 'dataTransfer', {
		value: { clearData: vi.fn(), getData: vi.fn(() => ''), setData: vi.fn(), types: [] },
	});
	return event as DragEvent;
};

// 에디터 x 100~400. 블록 높이 100: one(0~100), text(100~200), two(200~300), three(300~400)
const BLOCK_RECTS: Record<string, DOMRect> = {
	one: new DOMRect(100, 0, 300, 100),
	text: new DOMRect(100, 100, 300, 100),
	two: new DOMRect(100, 200, 300, 100),
	three: new DOMRect(100, 300, 300, 100),
};

const layoutOf = (editor: BlockNoteEditor<typeof POST_WRITE_SCHEMA.blockSchema>) =>
	editor.document.map((block) =>
		block.type === 'columnList' ? block.children.map((column) => column.children[0]?.id) : block.id,
	);

const setup = (run: (context: Context) => void) => {
	const editor = BlockNoteEditor.create({
		schema: POST_WRITE_SCHEMA,
		initialContent: [
			{ id: 'one', type: 'image', props: { url: 'https://example.com/one.png' } },
			{ id: 'text', type: 'paragraph', content: '본문' },
			{ id: 'two', type: 'image', props: { url: 'https://example.com/two.png' } },
			{ id: 'three', type: 'image', props: { url: 'https://example.com/three.png' } },
		],
	});
	const host = document.createElement('div');
	document.body.append(host);
	editor.mount(host);
	const menu = document.createElement('div');
	menu.className = 'bn-side-menu';
	const handle = document.createElement('button');
	handle.draggable = true;
	menu.append(handle);
	document.body.append(menu);
	const cleanup = installImageRowDrag(editor);

	const root = editor.domElement as HTMLElement;
	vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 300, 400));
	for (const [id, rect] of Object.entries(BLOCK_RECTS)) {
		const block = root.querySelector<HTMLElement>(`.bn-block[data-id="${id}"]`);
		if (block) vi.spyOn(block, 'getBoundingClientRect').mockReturnValue(rect);
	}
	const image = (id: string) => root.querySelector<HTMLImageElement>(`.bn-block[data-id="${id}"] img`) as HTMLElement;
	const block = (id: string) => root.querySelector<HTMLElement>(`.bn-block[data-id="${id}"]`) as HTMLElement;
	const verticalGuide = document.querySelector<HTMLElement>('.post-write-image-row-guide');
	const horizontalGuide = document.querySelector<HTMLElement>('.post-write-image-row-detach-guide');
	const dragHandle = (blockId: string) => {
		const state = editor.getExtension(SideMenuExtension);
		state?.store.setState(() => ({
			block: editor.document.find((candidate) => candidate.id === blockId) ?? editor.document[0],
			referencePos: new DOMRect(),
			show: true,
		}));
		const event = dragEvent('dragstart');
		handle.dispatchEvent(event);
		return event;
	};
	try {
		run({ editor, root, image, block, verticalGuide, horizontalGuide, dragHandle });
	} finally {
		cleanup();
		editor.unmount();
		host.remove();
		menu.remove();
		vi.restoreAllMocks();
	}
};

interface Context {
	editor: BlockNoteEditor<typeof POST_WRITE_SCHEMA.blockSchema>;
	root: HTMLElement;
	image: (id: string) => HTMLElement;
	block: (id: string) => HTMLElement;
	verticalGuide: HTMLElement | null;
	horizontalGuide: HTMLElement | null;
	dragHandle: (blockId: string) => DragEvent;
}

describe('installImageRowDrag', () => {
	it('단독 이미지를 다른 이미지의 좌측 25%에 놓으면 세로 가이드가 보이고 이미지행이 만들어진다', () =>
		setup(({ editor, root, image, block, verticalGuide, horizontalGuide }) => {
			image('one').dispatchEvent(dragEvent('dragstart'));
			expect(root.classList.contains('post-write-image-row-dragging')).toBe(true);
			const over = dragEvent('dragover', 110, 250);
			block('two').dispatchEvent(over);
			expect(over.defaultPrevented).toBe(true);
			expect(verticalGuide?.hidden).toBe(false);
			expect(verticalGuide?.style.left).toBe('84px');
			expect(horizontalGuide?.hidden).toBe(true);
			block('two').dispatchEvent(dragEvent('drop', 110, 250));
			expect(layoutOf(editor)).toEqual(['text', ['one', 'two'], 'three']);
			expect(verticalGuide?.hidden).toBe(true);
			expect(root.classList.contains('post-write-image-row-dragging')).toBe(false);
			expect(editor.undo()).toBe(true);
			expect(layoutOf(editor)).toEqual(['one', 'text', 'two', 'three']);
		}));

	it('이미지를 일반 블록 아래쪽에 놓으면 가로 가이드를 표시하고 순서를 바꾼다', () =>
		setup(({ editor, image, block, verticalGuide, horizontalGuide }) => {
			image('one').dispatchEvent(dragEvent('dragstart'));
			const over = dragEvent('dragover', 250, 190);
			block('text').dispatchEvent(over);
			expect(over.defaultPrevented).toBe(true);
			expect(horizontalGuide?.hidden).toBe(false);
			expect(horizontalGuide?.style.top).toBe('200px');
			expect(horizontalGuide?.style.width).toBe('300px');
			expect(verticalGuide?.hidden).toBe(true);
			block('text').dispatchEvent(dragEvent('drop', 250, 190));
			expect(layoutOf(editor)).toEqual(['text', 'one', 'two', 'three']);
		}));

	it('판정이 X인 영역에는 가이드가 없고 드롭해도 문서가 바뀌지 않는다', () =>
		setup(({ editor, image, block, verticalGuide, horizontalGuide }) => {
			image('one').dispatchEvent(dragEvent('dragstart'));
			// 그 외 블록의 좌측 25%: 상하로 폴백하지 않는다.
			const over = dragEvent('dragover', 110, 150);
			block('text').dispatchEvent(over);
			expect(over.defaultPrevented).toBe(false);
			expect(verticalGuide?.hidden).toBe(true);
			expect(horizontalGuide?.hidden).toBe(true);
			const drop = dragEvent('drop', 110, 150);
			block('text').dispatchEvent(drop);
			expect(layoutOf(editor)).toEqual(['one', 'text', 'two', 'three']);
		}));

	it('그 외 블록은 핸들로 드래그해 이미지 위/아래에만 놓을 수 있다', () =>
		setup(({ editor, block, dragHandle, verticalGuide, horizontalGuide }) => {
			dragHandle('text');
			// 이미지의 좌우 영역은 X
			const side = dragEvent('dragover', 110, 250);
			block('two').dispatchEvent(side);
			expect(side.defaultPrevented).toBe(false);
			expect(verticalGuide?.hidden).toBe(true);
			const over = dragEvent('dragover', 250, 290);
			block('two').dispatchEvent(over);
			expect(over.defaultPrevented).toBe(true);
			expect(horizontalGuide?.style.top).toBe('300px');
			block('two').dispatchEvent(dragEvent('drop', 250, 290));
			expect(layoutOf(editor)).toEqual(['one', 'two', 'text', 'three']);
		}));

	it('제자리에는 가이드선을 표시하지 않는다', () =>
		setup(({ block, dragHandle, horizontalGuide }) => {
			dragHandle('text');
			const over = dragEvent('dragover', 250, 190);
			block('text').dispatchEvent(over);
			expect(over.defaultPrevented).toBe(false);
			expect(horizontalGuide?.hidden).toBe(true);
		}));

	it('이미지행 전체를 잡는 핸들 드래그는 시작 단계에서 막는다', () =>
		setup(({ editor, root, dragHandle }) => {
			applyImageRowDrop(
				editor,
				{ kind: 'standalone-image', blockId: 'one' },
				{ targetId: 'two', direction: 'left', insertIndex: 0 },
			);
			const rowId = editor.document.find((candidate) => candidate.type === 'columnList')?.id ?? '';
			const start = dragHandle(rowId);
			expect(start.defaultPrevented).toBe(true);
			expect(root.classList.contains('post-write-image-row-dragging')).toBe(false);
		}));

	it('Escape와 드래그 종료는 가이드를 지우고 드래그 상태를 해제한다', () =>
		setup(({ root, image, block, verticalGuide }) => {
			image('one').dispatchEvent(dragEvent('dragstart'));
			block('two').dispatchEvent(dragEvent('dragover', 110, 250));
			expect(verticalGuide?.hidden).toBe(false);
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
			expect(verticalGuide?.hidden).toBe(true);
			expect(root.classList.contains('post-write-image-row-dragging')).toBe(false);

			image('one').dispatchEvent(dragEvent('dragstart'));
			block('two').dispatchEvent(dragEvent('dragover', 110, 250));
			block('two').dispatchEvent(dragEvent('dragend', 110, 250));
			expect(verticalGuide?.hidden).toBe(true);
		}));
});
