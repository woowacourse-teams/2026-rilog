'use client';

import { useCallback, useRef } from 'react';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';

import { importImage } from '@/shared/api/uploads/api';

import { showUploadBlockError } from '../lib/show-upload-block-error';
import { isTransientMediaUrl } from '../lib/validate-post-media';

export const IMAGE_IMPORT_ERROR_MESSAGE = '이미지를 가져오지 못했습니다. 파일로 다시 업로드해 주세요.';

const isHttpUrl = (url: string): boolean => {
	try {
		const parsed = new URL(url.trim());
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
};

export const usePostWriteImageImport = () => {
	const inFlightUrlsRef = useRef<Set<string>>(new Set());
	const importedUrlsRef = useRef<Set<string>>(new Set());

	const handleImageImport = useCallback(
		async (editor: PostWriteBlockNoteEditor, blockId: string, sourceUrl: string) => {
			const trimmedUrl = sourceUrl.trim();
			if (
				trimmedUrl === '' ||
				isTransientMediaUrl(trimmedUrl) ||
				!isHttpUrl(trimmedUrl) ||
				inFlightUrlsRef.current.has(trimmedUrl) ||
				importedUrlsRef.current.has(trimmedUrl)
			) {
				return;
			}

			inFlightUrlsRef.current.add(trimmedUrl);
			try {
				const response = await importImage({
					sourceUrl: trimmedUrl,
					imagePurpose: 'CONTENT',
				});
				const importedUrl = response.data.url;
				importedUrlsRef.current.add(trimmedUrl);
				importedUrlsRef.current.add(importedUrl);

				const currentBlock = editor.getBlock(blockId);
				if (currentBlock !== undefined && currentBlock.type === 'image' && currentBlock.props.url === sourceUrl) {
					editor.updateBlock(blockId, { props: { url: importedUrl } });
				}
			} catch {
				const currentBlock = editor.getBlock(blockId);
				if (currentBlock !== undefined && currentBlock.type === 'image' && currentBlock.props.url === sourceUrl) {
					editor.updateBlock(blockId, { props: { url: '' } });
					window.setTimeout(() => showUploadBlockError(editor, blockId, IMAGE_IMPORT_ERROR_MESSAGE), 0);
				}
			} finally {
				inFlightUrlsRef.current.delete(trimmedUrl);
			}
		},
		[],
	);

	return { handleImageImport };
};
