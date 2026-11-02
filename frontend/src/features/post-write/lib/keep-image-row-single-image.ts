import type { PostWriteBlockNoteEditor } from './post-write-schema';

/**
 * 이미지행 바로 아래 문단의 맨 앞에서 Backspace를 누르면 BlockNote가 문단을 마지막 열 안으로 옮긴다.
 * 열에는 이미지 하나만 허용하므로 내용이 있으면 병합을 막고, 빈 문단이면 지운 뒤 마지막 열의 이미지에 포커스를 둔다.
 * 열 안의 이미지를 Backspace/Delete로 지우면 빈 블록으로 남기지 않고 해당 열(2열이면 행 전체)을 지운다.
 * 열 안의 이미지에서 Enter를 누르면 열 대신 이미지행 아래에 문단을 만든다.
 */
export const keepImageRowSingleImage = (editor: PostWriteBlockNoteEditor): (() => void) => {
	const root = editor.domElement;
	if (root === undefined) return () => undefined;

	const onKeyDown = (event: KeyboardEvent) => {
		if (
			(event.key !== 'Backspace' && event.key !== 'Delete' && event.key !== 'Enter') ||
			event.isComposing ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey
		) {
			return;
		}
		if (event.target !== root) return;

		const { block, prevBlock, parentBlock } = editor.getTextCursorPosition();
		if (editor.getSelection() === undefined && block.type === 'image' && parentBlock?.type === 'column') {
			const row = editor.document.find(
				(candidate) =>
					candidate.type === 'columnList' && candidate.children.some((column) => column.id === parentBlock.id),
			);
			if (event.key === 'Enter') {
				if (row === undefined) return;
				event.preventDefault();
				event.stopPropagation();
				const paragraph = editor.insertBlocks([{ type: 'paragraph' }], row, 'after')[0];
				editor.setTextCursorPosition(paragraph);
				editor.focus();
				return;
			}
			const columnIndex = row?.children.findIndex((column) => column.id === parentBlock.id) ?? -1;
			const remainingColumns = row?.children.filter((column) => column.id !== parentBlock.id) ?? [];
			const nextColumn =
				event.key === 'Backspace'
					? remainingColumns[Math.max(0, columnIndex - 1)]
					: remainingColumns[Math.min(columnIndex, remainingColumns.length - 1)];
			const nextImage = nextColumn?.children[0];

			event.preventDefault();
			event.stopPropagation();
			editor.transact(() => {
				editor.removeBlocks([remainingColumns.length === 0 && row !== undefined ? row : parentBlock]);
				if (nextImage !== undefined) editor.setTextCursorPosition(nextImage);
			});
			editor.focus();
			return;
		}

		if (event.key !== 'Backspace' || block.type !== 'paragraph') return;

		const { selection } = editor.prosemirrorState;
		if (!selection.empty || selection.$from.parentOffset !== 0 || !selection.$from.parent.isTextblock) return;

		if (prevBlock?.type !== 'columnList') return;
		const isEmpty = block.content.length === 0 && block.children.length === 0;
		if (!isEmpty) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		const lastImage = prevBlock.children.at(-1)?.children.at(-1);
		if (lastImage === undefined) return;

		event.preventDefault();
		event.stopPropagation();
		editor.transact(() => {
			editor.removeBlocks([block]);
			editor.setTextCursorPosition(lastImage);
		});
		editor.focus();
	};

	root.ownerDocument.addEventListener('keydown', onKeyDown, true);
	return () => root.ownerDocument.removeEventListener('keydown', onKeyDown, true);
};
