'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';

import type { PostContentBlock } from '@/domains/post/model/post-content';
import { importImage } from '@/shared/api/uploads/api';

import { appendImageSizeHash } from '../lib/append-image-size-hash';
import {
	attachImageImportLoading,
	detachImageImportLoading,
	hasPendingImageImports,
	preloadImage,
} from '../lib/image-import-loading';
import { showUploadBlockError } from '../lib/show-upload-block-error';
import { updateMediaUrlWithoutHistory } from '../lib/update-media-url-without-history';
import { isTransientMediaUrl } from '../lib/validate-post-media';

export const IMAGE_IMPORT_ERROR_MESSAGE = '이미지를 가져오지 못했습니다. 파일로 다시 업로드해 주세요.';
export const MAX_CONCURRENT_IMAGE_IMPORTS = 1;

interface UsePostWriteImageImportOptions {
	onImportSettled?: () => void;
}

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

const replaceImportedImageUrl = (
	editor: PostWriteBlockNoteEditor,
	blockId: string,
	normalizedSourceUrl: string,
	importedUrl: string,
) => {
	const currentBlock = editor.getBlock(blockId);
	if (
		currentBlock === undefined ||
		currentBlock.type !== 'image' ||
		stripUrlHash(currentBlock.props.url.trim()) !== normalizedSourceUrl
	) {
		return;
	}

	const blockElement = editor.domElement?.querySelector(`[data-id="${blockId}"]`);
	const imgElement = blockElement?.querySelector<HTMLImageElement>('img.bn-visual-media, img');
	const currentWidth =
		typeof currentBlock.props.previewWidth === 'number' && currentBlock.props.previewWidth > 0
			? currentBlock.props.previewWidth
			: imgElement && imgElement.clientWidth > 0
				? Math.round(imgElement.clientWidth)
				: undefined;

	updateMediaUrlWithoutHistory(editor, blockId, importedUrl, currentWidth);
};

export const usePostWriteImageImport = ({ onImportSettled }: UsePostWriteImageImportOptions = {}) => {
	const pendingImportsByUrlRef = useRef<Map<string, PendingImportEntry>>(new Map());
	const activeImportsByUrlRef = useRef<Map<string, PendingImportEntry>>(new Map());
	const importQueueRef = useRef<string[]>([]);
	const activeCountRef = useRef(0);
	const uploadedImageUrlsRef = useRef<Set<string>>(new Set());
	const importedUrlBySourceUrlRef = useRef<Map<string, string>>(new Map());
	const processQueueRef = useRef<() => void>(() => undefined);
	const onImportSettledRef = useRef(onImportSettled);

	useEffect(() => {
		onImportSettledRef.current = onImportSettled;
	}, [onImportSettled]);

	const isUploadedImageUrl = useCallback((url: string): boolean => {
		const trimmedUrl = url.trim();
		if (trimmedUrl === '') return false;
		return uploadedImageUrlsRef.current.has(trimmedUrl) || uploadedImageUrlsRef.current.has(stripUrlHash(trimmedUrl));
	}, []);

	const registerUploadedImageUrl = useCallback((url: string) => {
		const trimmedUrl = url.trim();
		if (trimmedUrl === '') return;
		uploadedImageUrlsRef.current.add(trimmedUrl);
		uploadedImageUrlsRef.current.add(stripUrlHash(trimmedUrl));
	}, []);

	const hasPendingImports = useCallback(
		(blocks: PostContentBlock[]): boolean => hasPendingImageImports(blocks, isUploadedImageUrl),
		[isUploadedImageUrl],
	);

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
					let importedUrl = response.data.url;

					const firstBlockId = blockIds.values().next().value;
					if (firstBlockId) {
						const imgElement = editor.domElement?.querySelector<HTMLImageElement>(
							`[data-id="${firstBlockId}"] img.bn-visual-media, [data-id="${firstBlockId}"] img`,
						);
						if (imgElement && imgElement.naturalWidth > 0 && imgElement.naturalHeight > 0) {
							importedUrl = await appendImageSizeHash(
								{ width: imgElement.naturalWidth, height: imgElement.naturalHeight },
								importedUrl,
							);
						}
					}

					registerUploadedImageUrl(importedUrl);

					await preloadImage(importedUrl);

					for (const id of blockIds) {
						replaceImportedImageUrl(editor, id, normalizedUrl, importedUrl);
						detachImageImportLoading(editor, id);
					}
					importedUrlBySourceUrlRef.current.set(normalizedUrl, importedUrl);
				} catch {
					for (const id of blockIds) {
						detachImageImportLoading(editor, id);
						const currentBlock = editor.getBlock(id);
						if (
							currentBlock !== undefined &&
							currentBlock.type === 'image' &&
							(currentBlock.props.url === sourceUrl || stripUrlHash(currentBlock.props.url) === normalizedUrl)
						) {
							updateMediaUrlWithoutHistory(editor, id, '');
							window.setTimeout(() => showUploadBlockError(editor, id, IMAGE_IMPORT_ERROR_MESSAGE), 0);
						}
					}
				} finally {
					for (const id of blockIds) {
						detachImageImportLoading(editor, id);
					}
					activeImportsByUrlRef.current.delete(normalizedUrl);
					activeCountRef.current -= 1;
					for (const settle of settlers) {
						settle();
					}
					onImportSettledRef.current?.();
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
			const cachedImportedUrl = importedUrlBySourceUrlRef.current.get(normalizedUrl);
			if (cachedImportedUrl !== undefined) {
				replaceImportedImageUrl(editor, blockId, normalizedUrl, cachedImportedUrl);
				return Promise.resolve();
			}

			attachImageImportLoading(editor, blockId);

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

	return { handleImageImport, registerUploadedImageUrl, isUploadedImageUrl, hasPendingImports };
};
