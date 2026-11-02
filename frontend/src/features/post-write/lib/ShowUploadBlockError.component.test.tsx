import { describe, expect, it, vi } from 'vitest';

import type { PostWriteBlockNoteEditor } from './post-write-schema';

import { showUploadBlockError } from './show-upload-block-error';

describe('showUploadBlockError', () => {
	it('재시도 버튼을 다시 그려도 실행 취소 히스토리에 변경을 추가하지 않는다', () => {
		const block = { id: 'pasted-image', type: 'image', props: { url: '' } };
		const domElement = document.createElement('div');
		const blockElement = document.createElement('div');
		blockElement.dataset.id = block.id;
		domElement.append(blockElement);
		const setMeta = vi.fn();
		const replaceBlocks = vi.fn(() => {
			if (replaceBlocks.mock.calls.length === 2) {
				const addFileButton = document.createElement('div');
				addFileButton.className = 'bn-add-file-button';
				blockElement.append(addFileButton);
			}
		});
		const editor = {
			domElement,
			getBlock: vi.fn(() => block),
			getTextCursorPosition: () => ({ block: { id: block.id } }),
			replaceBlocks,
			transact: (callback: (transaction: { setMeta: typeof setMeta }) => void) => callback({ setMeta }),
		} as unknown as PostWriteBlockNoteEditor;

		showUploadBlockError(editor, block.id, '파일로 다시 업로드해 주세요.');

		expect(replaceBlocks).toHaveBeenCalledTimes(2);
		expect(setMeta).toHaveBeenCalledTimes(2);
		expect(setMeta).toHaveBeenCalledWith('addToHistory', false);
		expect(blockElement.querySelector('[role="alert"]')).toHaveTextContent('파일로 다시 업로드해 주세요.');
	});
});
