import type { PostWriteBlockNoteEditor } from './post-write-schema';

export const showUploadBlockError = (editor: PostWriteBlockNoteEditor, blockId: string, message: string): void => {
	const block = editor.getBlock(blockId);
	if (block === undefined || !('url' in block.props) || block.props.url !== '') return;

	// BlockNote 0.53 reuses the loading node, so replace it to render the retry button.
	editor.replaceBlocks([block], [{ id: block.id, type: 'paragraph' }]);
	editor.replaceBlocks([block.id], [block]);
	const addFileButton = editor.domElement?.querySelector(`[data-id="${blockId}"] .bn-add-file-button`);
	if (addFileButton === undefined || addFileButton === null) return;

	const errorMessage = document.createElement('p');
	errorMessage.className = 'post-write-upload-error';
	errorMessage.setAttribute('role', 'alert');
	errorMessage.textContent = message;
	addFileButton.appendChild(errorMessage);
};
