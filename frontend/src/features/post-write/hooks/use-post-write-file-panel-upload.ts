'use client';

import { useState } from 'react';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';

import { getUploadErrorMessage } from '../lib/get-upload-error-message';
import { getUploadFormatError } from '../lib/get-upload-format-error';
import { getUploadedUrl } from '../lib/get-uploaded-url';
import { insertUploadBlock, isUploadBlockType } from '../lib/insert-upload-block';

export const usePostWriteFilePanelUpload = (
	editor: PostWriteBlockNoteEditor,
	blockId: string,
	onSuccess?: () => void,
) => {
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);

	const uploadFiles = async (files: File[]) => {
		const uploadFile = editor.uploadFile;
		if (files.length === 0 || isUploading || uploadFile === undefined) {
			return;
		}
		const currentBlock = editor.getBlock(blockId);
		if (currentBlock === undefined || !isUploadBlockType(currentBlock.type)) {
			return;
		}
		setErrorMessage(null);
		setIsUploading(true);

		// The selected block receives the first file; later files get adjacent blocks.
		const destinations = [blockId];
		let previousBlockId = blockId;
		for (const file of files.slice(1)) {
			const id = insertUploadBlock(editor, currentBlock.type, file, previousBlockId, 'after');
			destinations.push(id);
			previousBlockId = id;
		}

		let failures = 0;
		await Promise.all(
			files.map(async (file, index) => {
				const destinationId = destinations[index];
				const formatError = getUploadFormatError(file, currentBlock.type);
				try {
					const result = await uploadFile(file, destinationId);
					if (!editor.getBlock(destinationId)) {
						return;
					}
					const url = getUploadedUrl(result);
					if (url !== null) {
						editor.updateBlock(destinationId, { props: { name: file.name, url } });
					} else {
						failures += 1;
						setErrorMessage(formatError ?? '일부 파일을 업로드하지 못했습니다. 빈 블록에서 다시 시도해 주세요.');
					}
				} catch (error) {
					failures += 1;
					setErrorMessage(getUploadErrorMessage(error));
				}
			}),
		);
		setIsUploading(false);
		if (failures === 0) {
			onSuccess?.();
		}
	};

	return { uploadFiles, isUploading, errorMessage };
};
