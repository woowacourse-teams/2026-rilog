'use client';

import { useEffect } from 'react';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';

import { getUploadedUrl } from '../lib/get-uploaded-url';
import { getTransferBlockType, getTransferInsertionPoint, insertUploadBlock } from '../lib/insert-upload-block';
import { normalizeMarkdownImages } from '../lib/normalize-markdown-images';

export const usePostWriteTransferUpload = (editor: PostWriteBlockNoteEditor) => {
	useEffect(() => {
		const editorElement = editor.domElement;
		if (editorElement === undefined) {
			return;
		}

		let isDispatchingNormalizedPaste = false;

		const handleTransfer = (event: ClipboardEvent | DragEvent) => {
			const transfer = event instanceof ClipboardEvent ? event.clipboardData : event.dataTransfer;
			if (transfer === null) return;
			const files = Array.from(transfer.files);
			if (files.length >= 2 && editor.uploadFile !== undefined) {
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
				return;
			}

			if (
				event instanceof ClipboardEvent &&
				files.length === 0 &&
				!isDispatchingNormalizedPaste &&
				transfer.types.length === 1 &&
				transfer.types.includes('text/plain')
			) {
				const plainText = transfer.getData('text/plain');
				if (plainText.includes('![') && editor.getTextCursorPosition().block.type !== 'codeBlock') {
					const normalized = normalizeMarkdownImages(plainText);
					if (normalized.replaceAll('\r\n', '\n') !== plainText.replaceAll('\r\n', '\n')) {
						event.preventDefault();
						event.stopPropagation();
						isDispatchingNormalizedPaste = true;
						try {
							const normalizedTransfer = new DataTransfer();
							normalizedTransfer.setData('text/plain', normalized);
							editorElement.dispatchEvent(
								new ClipboardEvent('paste', {
									bubbles: true,
									cancelable: true,
									clipboardData: normalizedTransfer,
								}),
							);
						} finally {
							isDispatchingNormalizedPaste = false;
						}
					}
				}
			}
		};

		editorElement.addEventListener('paste', handleTransfer, true);
		editorElement.addEventListener('drop', handleTransfer, true);
		return () => {
			editorElement.removeEventListener('paste', handleTransfer, true);
			editorElement.removeEventListener('drop', handleTransfer, true);
		};
	}, [editor]);
};
