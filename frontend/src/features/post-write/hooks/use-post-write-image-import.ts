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

const stripUrlHash = (url: string): string => {
	const hashIndex = url.indexOf('#');
	return hashIndex === -1 ? url : url.slice(0, hashIndex);
};

export const usePostWriteImageImport = () => {
	const inFlightUrlsRef = useRef<Set<string>>(new Set());
	const uploadedImageUrlsRef = useRef<Set<string>>(new Set());

	const registerUploadedImageUrl = useCallback((url: string) => {
		const trimmedUrl = url.trim();
		if (trimmedUrl === '') return;
		uploadedImageUrlsRef.current.add(trimmedUrl);
		uploadedImageUrlsRef.current.add(stripUrlHash(trimmedUrl));
	}, []);

	const handleImageImport = useCallback(
		async (editor: PostWriteBlockNoteEditor, blockId: string, sourceUrl: string) => {
			const trimmedUrl = sourceUrl.trim();
			const baseUrl = stripUrlHash(trimmedUrl);
			if (
				trimmedUrl === '' ||
				isTransientMediaUrl(trimmedUrl) ||
				!isHttpUrl(trimmedUrl) ||
				uploadedImageUrlsRef.current.has(trimmedUrl) ||
				uploadedImageUrlsRef.current.has(baseUrl) ||
				inFlightUrlsRef.current.has(trimmedUrl) ||
				inFlightUrlsRef.current.has(baseUrl)
			) {
				return;
			}

			inFlightUrlsRef.current.add(trimmedUrl);
			inFlightUrlsRef.current.add(baseUrl);
			try {
				const response = await importImage({
					sourceUrl: trimmedUrl,
					imagePurpose: 'CONTENT',
				});
				const importedUrl = response.data.url;
				registerUploadedImageUrl(trimmedUrl);
				registerUploadedImageUrl(importedUrl);

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
				inFlightUrlsRef.current.delete(baseUrl);
			}
		},
		[registerUploadedImageUrl],
	);

	return { handleImageImport, registerUploadedImageUrl };
};
