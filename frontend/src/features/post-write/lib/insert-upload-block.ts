import type { PostWriteBlockNoteEditor } from './post-write-schema';

export type UploadBlockType = 'image' | 'file' | 'video' | 'audio';

export const getTransferBlockType = (file: File): UploadBlockType => {
	if (file.type.startsWith('image/') || /\.heic$/i.test(file.name)) return 'image';
	if (file.type.startsWith('video/')) return 'video';
	if (file.type.startsWith('audio/')) return 'audio';
	return 'file';
};

export const isUploadBlockType = (type: string): type is UploadBlockType =>
	type === 'image' || type === 'file' || type === 'video' || type === 'audio';

export const getTransferInsertionPoint = (editor: PostWriteBlockNoteEditor, event: ClipboardEvent | DragEvent) => {
	const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-id]') : null;
	const targetId = target?.dataset.id;
	const cursorBlock = editor.getTextCursorPosition().block;
	const referenceId = targetId !== undefined && editor.getBlock(targetId) !== undefined ? targetId : cursorBlock.id;
	const placement: 'before' | 'after' =
		event instanceof DragEvent &&
		target !== null &&
		event.clientY < target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2
			? 'before'
			: 'after';
	return { referenceId, placement };
};

const insertBlock = (
	editor: PostWriteBlockNoteEditor,
	type: UploadBlockType,
	referenceId: string,
	placement: 'before' | 'after',
	props: { name: string } | undefined,
): string => {
	switch (type) {
		case 'image':
			return editor.insertBlocks([{ type: 'image', props }], referenceId, placement)[0].id;
		case 'file':
			return editor.insertBlocks([{ type: 'file', props }], referenceId, placement)[0].id;
		case 'video':
			return editor.insertBlocks([{ type: 'video', props }], referenceId, placement)[0].id;
		case 'audio':
			return editor.insertBlocks([{ type: 'audio', props }], referenceId, placement)[0].id;
	}
};

export const insertUploadBlock = (
	editor: PostWriteBlockNoteEditor,
	type: UploadBlockType,
	file: File,
	referenceId: string,
	placement: 'before' | 'after',
): string => insertBlock(editor, type, referenceId, placement, { name: file.name });

export const insertEmptyUploadBlock = (
	editor: PostWriteBlockNoteEditor,
	type: UploadBlockType,
	referenceId: string,
	placement: 'before' | 'after',
): string => insertBlock(editor, type, referenceId, placement, undefined);
