'use client';

import { useCallback, useRef } from 'react';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';
import type { UploadPostBodyFile } from '../model/post-editor';

import { getUploadErrorMessage } from '../lib/get-upload-error-message';
import { getUploadFormatError } from '../lib/get-upload-format-error';
import { prepareUploadFile } from '../lib/prepare-upload-file';
import { showUploadBlockError } from '../lib/show-upload-block-error';

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
		resetFailedUploadBlockRef.current = (blockId, message) => showUploadBlockError(editor, blockId, message);
		return () => {
			getUploadBlockTypeRef.current = () => undefined;
			resetFailedUploadBlockRef.current = () => undefined;
		};
	}, []);

	return { uploadFileWithFeedback, connectEditor };
};
