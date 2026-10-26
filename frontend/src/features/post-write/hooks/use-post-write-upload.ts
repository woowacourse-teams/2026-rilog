'use client';

import { useCallback, useRef } from 'react';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';
import type { UploadPostBodyFile } from '../model/post-editor';

import { getUploadErrorMessage } from '../lib/get-upload-error-message';
import { getUploadFormatError } from '../lib/get-upload-format-error';
import { prepareUploadFile } from '../lib/prepare-upload-file';

export const usePostWriteUpload = (uploadFile: UploadPostBodyFile) => {
	const resetFailedUploadBlockRef = useRef<(blockId: string, message: string) => void>(() => undefined);
	const getUploadBlockTypeRef = useRef<(blockId: string) => string | undefined>(() => undefined);

	const uploadFileWithFeedback = useCallback(
		async (file: File, blockId?: string) => {
			const blockType = blockId === undefined ? undefined : getUploadBlockTypeRef.current(blockId);
			if (blockId !== undefined) {
				const formatError = blockType === undefined ? null : getUploadFormatError(file, blockType);
				if (formatError !== null) {
					window.setTimeout(() => resetFailedUploadBlockRef.current(blockId, formatError), 0);
					return {};
				}
			}
			try {
				const preparedFile =
					blockType !== undefined || /\.heic$/i.test(file.name)
						? await prepareUploadFile(file, blockType ?? 'image')
						: file;
				return await uploadFile(preparedFile);
			} catch (error) {
				const message = getUploadErrorMessage(error);
				if (blockId !== undefined) {
					// BlockNote finishes its own update after the upload Promise settles.
					window.setTimeout(() => resetFailedUploadBlockRef.current(blockId, message), 0);
				}
				return {};
			}
		},
		[uploadFile],
	);

	const connectEditor = useCallback((editor: PostWriteBlockNoteEditor) => {
		getUploadBlockTypeRef.current = (blockId) => editor.getBlock(blockId)?.type;
		resetFailedUploadBlockRef.current = (blockId, message) => {
			const block = editor.getBlock(blockId);
			if (block !== undefined && 'url' in block.props && block.props.url === '') {
				// BlockNote 0.53 reuses the loading node, so replace it to render the retry button.
				editor.replaceBlocks([block], [{ id: block.id, type: 'paragraph' }]);
				editor.replaceBlocks([block.id], [block]);
				const addFileButton = editor.domElement?.querySelector(`[data-id="${blockId}"] .bn-add-file-button`);
				if (addFileButton !== undefined && addFileButton !== null) {
					const errorMessage = document.createElement('p');
					errorMessage.className = 'post-write-upload-error';
					errorMessage.setAttribute('role', 'alert');
					errorMessage.textContent = message;
					addFileButton.appendChild(errorMessage);
				}
			}
		};
		return () => {
			getUploadBlockTypeRef.current = () => undefined;
			resetFailedUploadBlockRef.current = () => undefined;
		};
	}, []);

	return { uploadFileWithFeedback, connectEditor };
};
