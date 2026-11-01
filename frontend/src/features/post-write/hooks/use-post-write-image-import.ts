'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';

import { importImage } from '@/shared/api/uploads/api';

import { showUploadBlockError } from '../lib/show-upload-block-error';
import { isTransientMediaUrl } from '../lib/validate-post-media';

export const IMAGE_IMPORT_ERROR_MESSAGE = '이미지를 가져오지 못했습니다. 파일로 다시 업로드해 주세요.';
export const MAX_CONCURRENT_IMAGE_IMPORTS = 1;

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

interface PendingImportEntry {
	editor: PostWriteBlockNoteEditor;
	sourceUrl: string;
	blockIds: Set<string>;
	settlers: Array<() => void>;
}

export const usePostWriteImageImport = () => {
	const pendingImportsByUrlRef = useRef<Map<string, PendingImportEntry>>(new Map());
	const activeImportsByUrlRef = useRef<Map<string, PendingImportEntry>>(new Map());
	const importQueueRef = useRef<string[]>([]);
	const activeCountRef = useRef(0);
	const uploadedImageUrlsRef = useRef<Set<string>>(new Set());
	const processQueueRef = useRef<() => void>(() => undefined);

	const registerUploadedImageUrl = useCallback((url: string) => {
		const trimmedUrl = url.trim();
		if (trimmedUrl === '') return;
		uploadedImageUrlsRef.current.add(trimmedUrl);
		uploadedImageUrlsRef.current.add(stripUrlHash(trimmedUrl));
	}, []);

	const processQueue = useCallback(() => {
		while (activeCountRef.current < MAX_CONCURRENT_IMAGE_IMPORTS && importQueueRef.current.length > 0) {
			const normalizedUrl = importQueueRef.current.shift();
			if (normalizedUrl === undefined) break;

			const entry = pendingImportsByUrlRef.current.get(normalizedUrl);
			if (entry === undefined) continue;

			pendingImportsByUrlRef.current.delete(normalizedUrl);
			activeImportsByUrlRef.current.set(normalizedUrl, entry);
			activeCountRef.current += 1;

			void (async () => {
				const { editor, sourceUrl, blockIds, settlers } = entry;
				try {
					const response = await importImage({
						sourceUrl: normalizedUrl,
						imagePurpose: 'CONTENT',
					});
					const importedUrl = response.data.url;
					registerUploadedImageUrl(sourceUrl);
					registerUploadedImageUrl(normalizedUrl);
					registerUploadedImageUrl(importedUrl);

					for (const id of blockIds) {
						const currentBlock = editor.getBlock(id);
						if (
							currentBlock !== undefined &&
							currentBlock.type === 'image' &&
							(currentBlock.props.url === sourceUrl || stripUrlHash(currentBlock.props.url) === normalizedUrl)
						) {
							editor.updateBlock(id, { props: { url: importedUrl } });
						}
					}
				} catch {
					for (const id of blockIds) {
						const currentBlock = editor.getBlock(id);
						if (
							currentBlock !== undefined &&
							currentBlock.type === 'image' &&
							(currentBlock.props.url === sourceUrl || stripUrlHash(currentBlock.props.url) === normalizedUrl)
						) {
							editor.updateBlock(id, { props: { url: '' } });
							window.setTimeout(() => showUploadBlockError(editor, id, IMAGE_IMPORT_ERROR_MESSAGE), 0);
						}
					}
				} finally {
					activeImportsByUrlRef.current.delete(normalizedUrl);
					activeCountRef.current -= 1;
					for (const settle of settlers) {
						settle();
					}
					processQueueRef.current();
				}
			})();
		}
	}, [registerUploadedImageUrl]);

	useEffect(() => {
		processQueueRef.current = processQueue;
	}, [processQueue]);

	const handleImageImport = useCallback(
		(editor: PostWriteBlockNoteEditor, blockId: string, sourceUrl: string): Promise<void> => {
			const trimmedUrl = sourceUrl.trim();
			const normalizedUrl = stripUrlHash(trimmedUrl);
			if (
				trimmedUrl === '' ||
				isTransientMediaUrl(trimmedUrl) ||
				!isHttpUrl(trimmedUrl) ||
				uploadedImageUrlsRef.current.has(trimmedUrl) ||
				uploadedImageUrlsRef.current.has(normalizedUrl)
			) {
				return Promise.resolve();
			}

			return new Promise<void>((resolve) => {
				const activeEntry = activeImportsByUrlRef.current.get(normalizedUrl);
				if (activeEntry !== undefined) {
					activeEntry.blockIds.add(blockId);
					activeEntry.settlers.push(resolve);
					return;
				}

				const pendingEntry = pendingImportsByUrlRef.current.get(normalizedUrl);
				if (pendingEntry !== undefined) {
					pendingEntry.blockIds.add(blockId);
					pendingEntry.settlers.push(resolve);
					return;
				}

				pendingImportsByUrlRef.current.set(normalizedUrl, {
					editor,
					sourceUrl,
					blockIds: new Set([blockId]),
					settlers: [resolve],
				});
				importQueueRef.current.push(normalizedUrl);
				processQueue();
			});
		},
		[processQueue],
	);

	return { handleImageImport, registerUploadedImageUrl };
};
