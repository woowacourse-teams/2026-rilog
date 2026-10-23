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

export const insertUploadBlock = (
	editor: PostWriteBlockNoteEditor,
	type: UploadBlockType,
	file: File,
	referenceId: string,
	placement: 'before' | 'after',
): string => {
	const props = { name: file.name };
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
