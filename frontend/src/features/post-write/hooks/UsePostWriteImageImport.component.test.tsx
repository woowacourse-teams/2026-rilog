import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';

import * as uploadsApi from '@/shared/api/uploads/api';

import * as showUploadBlockErrorModule from '../lib/show-upload-block-error';

import { IMAGE_IMPORT_ERROR_MESSAGE, usePostWriteImageImport } from './use-post-write-image-import';

describe('usePostWriteImageImport', () => {
	let mockEditor: PostWriteBlockNoteEditor;
	let updateBlockMock: ReturnType<typeof vi.fn>;
	let blocksState: Record<string, { id: string; type: string; props: { url: string } }>;

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();

		blocksState = {
			'block-1': { id: 'block-1', type: 'image', props: { url: 'https://external.test/img.png' } },
		};

		updateBlockMock = vi.fn((blockOrId: unknown, update: unknown) => {
			const id = typeof blockOrId === 'string' ? blockOrId : (blockOrId as { id: string }).id;
			const props = (update as { props?: { url?: string } })?.props;
			if (blocksState[id] && props) {
				blocksState[id] = {
					...blocksState[id],
					props: { ...blocksState[id].props, ...props },
				};
			}
		});

		mockEditor = {
			getBlock: vi.fn((id: string) => blocksState[id] as never),
			updateBlock: updateBlockMock,
		} as unknown as PostWriteBlockNoteEditor;
	});

	it('외부 HTTP URL 이미지 블록을 만나면 importImage API를 호출하고 새 URL로 블록을 업데이트한다', async () => {
		const importSpy = vi.spyOn(uploadsApi, 'importImage').mockResolvedValue({
			status: 200,
			message: '성공',
			data: {
				objectKey: 'rilog/images/raw/test/original.webp',
				url: 'https://images.rilog.test/rilog/images/raw/test/original.webp',
			},
		});

		const { result } = renderHook(() => usePostWriteImageImport());
		await result.current.handleImageImport(mockEditor, 'block-1', 'https://external.test/img.png');

		expect(importSpy).toHaveBeenCalledWith({
			sourceUrl: 'https://external.test/img.png',
			imagePurpose: 'CONTENT',
		});
		expect(updateBlockMock).toHaveBeenCalledWith('block-1', {
			props: { url: 'https://images.rilog.test/rilog/images/raw/test/original.webp' },
		});
	});

	it('importImage API 실패 시 블록 url을 비우고 showUploadBlockError를 호출한다', async () => {
		vi.useFakeTimers();
		vi.spyOn(uploadsApi, 'importImage').mockRejectedValue(new Error('Network Error'));
		const showErrorSpy = vi
			.spyOn(showUploadBlockErrorModule, 'showUploadBlockError')
			.mockImplementation(() => undefined);

		const { result } = renderHook(() => usePostWriteImageImport());
		const promise = result.current.handleImageImport(mockEditor, 'block-1', 'https://external.test/img.png');
		await promise;

		expect(updateBlockMock).toHaveBeenCalledWith('block-1', { props: { url: '' } });
		vi.runAllTimers();
		expect(showErrorSpy).toHaveBeenCalledWith(mockEditor, 'block-1', IMAGE_IMPORT_ERROR_MESSAGE);
	});

	it('이미 임포트 완료된 URL은 다시 API를 호출하지 않는다', async () => {
		const importSpy = vi.spyOn(uploadsApi, 'importImage').mockResolvedValue({
			status: 200,
			message: '성공',
			data: {
				objectKey: 'rilog/images/raw/test/original.webp',
				url: 'https://images.rilog.test/rilog/images/raw/test/original.webp',
			},
		});

		const { result } = renderHook(() => usePostWriteImageImport());
		await result.current.handleImageImport(mockEditor, 'block-1', 'https://external.test/img.png');
		expect(importSpy).toHaveBeenCalledTimes(1);

		// 동일한 sourceUrl로 다시 호출
		await result.current.handleImageImport(mockEditor, 'block-1', 'https://external.test/img.png');
		expect(importSpy).toHaveBeenCalledTimes(1);

		// 임포트 결과로 발급된 URL로 호출되어도 무시
		await result.current.handleImageImport(
			mockEditor,
			'block-1',
			'https://images.rilog.test/rilog/images/raw/test/original.webp',
		);
		expect(importSpy).toHaveBeenCalledTimes(1);
	});

	it('data: 또는 blob: 같은 임시 미디어 URL이나 빈 URL은 무시한다', async () => {
		const importSpy = vi.spyOn(uploadsApi, 'importImage');
		const { result } = renderHook(() => usePostWriteImageImport());

		await result.current.handleImageImport(mockEditor, 'block-1', 'data:image/png;base64,abc');
		await result.current.handleImageImport(mockEditor, 'block-1', 'blob:http://localhost/123');
		await result.current.handleImageImport(mockEditor, 'block-1', '');

		expect(importSpy).not.toHaveBeenCalled();
	});
});
