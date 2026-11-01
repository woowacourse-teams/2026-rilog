import type { PostWriteBlockNoteEditor } from './post-write-schema';

export const showUploadBlockError = (editor: PostWriteBlockNoteEditor, blockId: string, message: string): void => {
	const block = editor.getBlock(blockId);
	if (block === undefined || !('url' in block.props) || block.props.url !== '') return;

	let addFileButton = editor.domElement?.querySelector(`[data-id="${blockId}"] .bn-add-file-button`);
	if (addFileButton === undefined || addFileButton === null) {
		const cursorBlockId = editor.getTextCursorPosition().block.id;
		// BlockNote 0.53 reuses the loading node, so replace it to render the retry button.
		editor.replaceBlocks([block], [{ id: block.id, type: 'paragraph' }]);
		editor.replaceBlocks([block.id], [block]);
		if (cursorBlockId !== block.id && editor.getBlock(cursorBlockId) !== undefined) {
			editor.setTextCursorPosition(cursorBlockId, 'end');
		}
		addFileButton = editor.domElement?.querySelector(`[data-id="${blockId}"] .bn-add-file-button`);
	}
	if (addFileButton === undefined || addFileButton === null) return;

	addFileButton.querySelector('.post-write-upload-error')?.remove();
	const errorMessage = document.createElement('p');
	errorMessage.className = 'post-write-upload-error';
	errorMessage.setAttribute('role', 'alert');
	errorMessage.textContent = message;
	addFileButton.appendChild(errorMessage);
};
