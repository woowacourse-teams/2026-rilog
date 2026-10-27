'use client';

import { useCallback } from 'react';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';

import { getTransientMediaHtmlType } from '../lib/has-transient-media-html';
import { getTransferInsertionPoint, insertEmptyUploadBlock } from '../lib/insert-upload-block';
import { showUploadBlockError } from '../lib/show-upload-block-error';

export const usePostWriteMediaTransferGuard = (editor: PostWriteBlockNoteEditor) =>
	useCallback(
		(event: ClipboardEvent | DragEvent): boolean => {
			const transfer = event instanceof ClipboardEvent ? event.clipboardData : event.dataTransfer;
			if (transfer === null) return false;

			const blockType = ['text/html', 'blocknote/html']
				.map((format) => getTransientMediaHtmlType(transfer.getData(format)))
				.find((type) => type !== null);
			if (blockType === undefined) return false;

			event.preventDefault();
			event.stopImmediatePropagation();
			const { referenceId, placement } = getTransferInsertionPoint(editor, event);
			const id = insertEmptyUploadBlock(editor, blockType, referenceId, placement);
			window.setTimeout(
				() =>
					showUploadBlockError(
						editor,
						id,
						'붙여넣은 이미지 또는 파일에 저장할 수 없는 주소가 포함되어 있습니다. 파일로 다시 업로드해 주세요.',
					),
				0,
			);
			return true;
		},
		[editor],
	);
