'use client';

import { useEffect } from 'react';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';

import { getUploadedUrl } from '../lib/get-uploaded-url';
import { getTransferBlockType, insertUploadBlock } from '../lib/insert-upload-block';

export const usePostWriteTransferUpload = (editor: PostWriteBlockNoteEditor) => {
	useEffect(() => {
		const editorElement = editor.domElement;
		if (editorElement === undefined || editor.uploadFile === undefined) {
			return;
		}

		const handleFiles = (event: ClipboardEvent | DragEvent) => {
			const transfer = event instanceof ClipboardEvent ? event.clipboardData : event.dataTransfer;
			const files = Array.from(transfer?.files ?? []);
			if (files.length < 2) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();

			const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-id]') : null;
			const targetId = target?.dataset.id;
			const cursorBlock = editor.getTextCursorPosition().block;
			let referenceId = targetId !== undefined && editor.getBlock(targetId) !== undefined ? targetId : cursorBlock.id;
			let placement: 'before' | 'after' =
				event instanceof DragEvent &&
				target !== null &&
				event.clientY < target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2
					? 'before'
					: 'after';
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

		editorElement.addEventListener('paste', handleFiles, true);
		editorElement.addEventListener('drop', handleFiles, true);
		return () => {
			editorElement.removeEventListener('paste', handleFiles, true);
			editorElement.removeEventListener('drop', handleFiles, true);
		};
	}, [editor]);
};
