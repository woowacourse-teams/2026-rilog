'use client';

import { useEffect } from 'react';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';

import { getUploadedUrl } from '../lib/get-uploaded-url';
import { getTransferBlockType, getTransferInsertionPoint, insertUploadBlock } from '../lib/insert-upload-block';

import { usePostWriteMediaTransferGuard } from './use-post-write-media-transfer-guard';

export const usePostWriteTransferUpload = (editor: PostWriteBlockNoteEditor) => {
	const guardTransfer = usePostWriteMediaTransferGuard(editor);

	useEffect(() => {
		const editorElement = editor.domElement;
		if (editorElement === undefined) {
			return;
		}

		const handleTransfer = (event: ClipboardEvent | DragEvent) => {
			if (guardTransfer(event)) return;

			const transfer = event instanceof ClipboardEvent ? event.clipboardData : event.dataTransfer;
			if (transfer === null) return;
			const files = Array.from(transfer.files);
			if (files.length < 2 || editor.uploadFile === undefined) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();

			let { referenceId, placement } = getTransferInsertionPoint(editor, event);

			const destinations: string[] = [];
			for (const file of files) {
				const id = insertUploadBlock(editor, getTransferBlockType(file), file, referenceId, placement);
				destinations.push(id);
				referenceId = id;
				placement = 'after';
			}

			void Promise.all(
				files.map(async (file, index) => {
					const id = destinations[index];
					try {
						const result = await editor.uploadFile?.(file, id);
						if (editor.getBlock(id) === undefined) {
							return;
						}
						const url = getUploadedUrl(result);
						if (url !== null) {
							editor.updateBlock(id, { props: { url } });
						}
					} catch {
						// The editor upload callback restores the failed block with its retry message.
					}
				}),
			);
		};

		editorElement.addEventListener('paste', handleTransfer, true);
		editorElement.addEventListener('drop', handleTransfer, true);
		return () => {
			editorElement.removeEventListener('paste', handleTransfer, true);
			editorElement.removeEventListener('drop', handleTransfer, true);
		};
	}, [editor, guardTransfer]);
};
