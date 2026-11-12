import type { PostWriteBlockNoteEditor } from './post-write-schema';

export const installTableExit = (editor: PostWriteBlockNoteEditor): (() => void) => {
	const element = editor.domElement;
	if (!element) return () => undefined;
	const exitTable = (event: KeyboardEvent) => {
		if (
			event.key !== 'Enter' ||
			event.isComposing ||
			event.keyCode === 229 ||
			event.shiftKey ||
			event.ctrlKey ||
			event.metaKey ||
			event.altKey ||
			!(event.target instanceof Node) ||
			!element.contains(event.target)
		)
			return;
		const selection = element.ownerDocument.getSelection();
		if (!selection?.isCollapsed || !selection.focusNode || !element.contains(selection.focusNode)) return;
		const position = editor.prosemirrorView.posAtDOM(selection.focusNode, selection.focusOffset);
		const $from = editor.prosemirrorState.doc.resolve(position);
		if (!$from.parent.type.isInGroup('tableContent') || $from.parentOffset !== $from.parent.content.size) return;
		let tableDepth = $from.depth - 1;
		while (tableDepth > 0 && $from.node(tableDepth).type.name !== 'table') tableDepth--;
		if (tableDepth === 0) return;
		for (let depth = tableDepth; depth < $from.depth; depth++) {
			if ($from.index(depth) !== $from.node(depth).childCount - 1) return;
		}
		const table = editor.getTextCursorPosition().block;
		if (table.type !== 'table') return;
		event.preventDefault();
		event.stopImmediatePropagation();
		editor.transact(() => {
			const next = editor.getNextBlock(table);
			const paragraph =
				next?.type === 'paragraph' && next.content.length === 0
					? next
					: editor.insertBlocks([{ type: 'paragraph' }], table, 'after')[0];
			editor.setTextCursorPosition(paragraph.id, 'start');
		});
	};
	element.ownerDocument.addEventListener('keydown', exitTable, true);
	return () => element.ownerDocument.removeEventListener('keydown', exitTable, true);
};
