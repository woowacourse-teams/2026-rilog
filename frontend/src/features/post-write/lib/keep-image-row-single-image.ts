import type { PostWriteBlockNoteEditor } from './post-write-schema';

/**
 * 이미지행 바로 아래 블록의 맨 앞에서 Backspace를 누르면 BlockNote가 그 블록을 마지막 열 안으로 옮긴다.
 * 열에는 이미지 하나만 허용하므로 블록을 옮기지 않고, 빈 블록이면 지운 뒤 마지막 열의 이미지에 포커스만 둔다.
 */
export const keepImageRowSingleImage = (editor: PostWriteBlockNoteEditor): (() => void) => {
	const root = editor.domElement;
	if (root === undefined) return () => undefined;

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key !== 'Backspace' || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
		if (event.target !== root) return;

		const { selection } = editor.prosemirrorState;
		if (!selection.empty || selection.$from.parentOffset !== 0 || !selection.$from.parent.isTextblock) return;

		const { block, prevBlock } = editor.getTextCursorPosition();
		if (prevBlock?.type !== 'columnList') return;
		const lastImage = prevBlock.children.at(-1)?.children.at(-1);
		if (lastImage === undefined) return;

		event.preventDefault();
		event.stopPropagation();
		const isEmpty = Array.isArray(block.content) && block.content.length === 0 && block.children.length === 0;
		editor.transact(() => {
			if (isEmpty) editor.removeBlocks([block]);
			editor.setTextCursorPosition(lastImage);
		});
		editor.focus();
	};

	root.ownerDocument.addEventListener('keydown', onKeyDown, true);
	return () => root.ownerDocument.removeEventListener('keydown', onKeyDown, true);
};
