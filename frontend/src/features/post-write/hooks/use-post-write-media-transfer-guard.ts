'use client';

import { useEffect, useState } from 'react';

import { hasTransientMediaHtml } from '../lib/has-transient-media-html';

interface MediaTransferEditor {
	domElement: HTMLElement | undefined;
}

export const usePostWriteMediaTransferGuard = (editor: MediaTransferEditor) => {
	const [transferError, setTransferError] = useState<string | null>(null);

	useEffect(() => {
		const editorElement = editor.domElement;
		if (editorElement === undefined) return;

		const guardTransfer = (event: ClipboardEvent | DragEvent) => {
			const transfer = 'clipboardData' in event ? event.clipboardData : event.dataTransfer;
			if (transfer === null) return;

			if (['text/html', 'blocknote/html'].some((format) => hasTransientMediaHtml(transfer.getData(format)))) {
				event.preventDefault();
				event.stopImmediatePropagation();
				setTransferError('붙여넣은 이미지에 저장할 수 없는 주소가 포함되어 있습니다. 이미지를 파일로 업로드해 주세요.');
				return;
			}
			setTransferError(null);
		};

		editorElement.addEventListener('paste', guardTransfer, true);
		editorElement.addEventListener('drop', guardTransfer, true);
		return () => {
			editorElement.removeEventListener('paste', guardTransfer, true);
			editorElement.removeEventListener('drop', guardTransfer, true);
		};
	}, [editor]);

	return transferError;
};
