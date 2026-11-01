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

	it('파일로 직접 업로드한 이미지는 외부 이미지 가져오기 API를 호출하지 않는다', async () => {
		const importSpy = vi.spyOn(uploadsApi, 'importImage');
		const { result } = renderHook(() => usePostWriteImageImport());

		result.current.registerUploadedImageUrl('https://cdn.rilog.test/uploaded-file.png#100x100');

		// 해시가 있는 URL로 import 요청 시 스킵
		await result.current.handleImageImport(mockEditor, 'block-1', 'https://cdn.rilog.test/uploaded-file.png#100x100');
		// 해시가 제거된 원본 URL로 import 요청 시에도 스킵
		await result.current.handleImageImport(mockEditor, 'block-1', 'https://cdn.rilog.test/uploaded-file.png');

		expect(importSpy).not.toHaveBeenCalled();
	});

	it('동일한 외부 이미지 주소를 가진 여러 블록이 한 번에 들어오면 API를 1회만 호출하고 모든 블록을 업데이트한다', async () => {
		blocksState['block-2'] = { id: 'block-2', type: 'image', props: { url: 'https://external.test/same.png' } };
		blocksState['block-3'] = { id: 'block-3', type: 'image', props: { url: 'https://external.test/same.png' } };

		const importSpy = vi.spyOn(uploadsApi, 'importImage').mockResolvedValue({
			status: 200,
			message: '성공',
			data: {
				objectKey: 'rilog/images/raw/test/same-original.webp',
				url: 'https://images.rilog.test/rilog/images/raw/test/same-original.webp',
			},
		});

		const { result } = renderHook(() => usePostWriteImageImport());
		await Promise.all([
			result.current.handleImageImport(mockEditor, 'block-2', 'https://external.test/same.png'),
			result.current.handleImageImport(mockEditor, 'block-3', 'https://external.test/same.png'),
		]);

		expect(importSpy).toHaveBeenCalledTimes(1);
		expect(updateBlockMock).toHaveBeenCalledWith('block-2', {
			props: { url: 'https://images.rilog.test/rilog/images/raw/test/same-original.webp' },
		});
		expect(updateBlockMock).toHaveBeenCalledWith('block-3', {
			props: { url: 'https://images.rilog.test/rilog/images/raw/test/same-original.webp' },
		});
	});

	it('이미지는 1장씩 순차적으로 요청을 처리하고 자리가 날 때마다 다음 이미지를 처리한다', async () => {
		let activeConcurrentRequests = 0;
		let maxConcurrentRequestsObserved = 0;
		const totalRequests = 5;

		for (let i = 1; i <= totalRequests; i++) {
			blocksState[`block-${i}`] = {
				id: `block-${i}`,
				type: 'image',
				props: { url: `https://external.test/photo-${i}.png` },
			};
		}

		vi.spyOn(uploadsApi, 'importImage').mockImplementation(async ({ sourceUrl }) => {
			activeConcurrentRequests += 1;
			maxConcurrentRequestsObserved = Math.max(maxConcurrentRequestsObserved, activeConcurrentRequests);
			await new Promise((resolve) => {
				setTimeout(resolve, 10);
			});
			activeConcurrentRequests -= 1;
			const fileName = sourceUrl.split('/').pop() ?? 'photo';
			return {
				status: 200,
				message: '성공',
				data: {
					objectKey: `rilog/images/raw/test/${fileName}.webp`,
					url: `https://images.rilog.test/rilog/images/raw/test/${fileName}.webp`,
				},
			};
		});

		const { result } = renderHook(() => usePostWriteImageImport());
		const promises = Array.from({ length: totalRequests }, (_, index) =>
			result.current.handleImageImport(
				mockEditor,
				`block-${index + 1}`,
				`https://external.test/photo-${index + 1}.png`,
			),
		);

		await Promise.all(promises);

		expect(maxConcurrentRequestsObserved).toBe(1);
		for (let i = 1; i <= totalRequests; i++) {
			expect(updateBlockMock).toHaveBeenCalledWith(`block-${i}`, {
				props: { url: `https://images.rilog.test/rilog/images/raw/test/photo-${i}.png.webp` },
			});
		}
	});

	it('data: 또는 blob: 같은 임시 미디어 URL이나 빈 URL은 무시한다', async () => {
		const importSpy = vi.spyOn(uploadsApi, 'importImage');
		const { result } = renderHook(() => usePostWriteImageImport());

		await result.current.handleImageImport(mockEditor, 'block-1', 'data:image/png;base64,abc');
		await result.current.handleImageImport(mockEditor, 'block-1', 'blob:http://localhost/123');
		await result.current.handleImageImport(mockEditor, 'block-1', '');

		expect(importSpy).not.toHaveBeenCalled();
	});

	it('이미지 변환 중 로딩 오버레이가 부착되고 완료 시 제거되며 onImportSettled가 호출된다', async () => {
		const domElement = document.createElement('div');
		const blockElement = document.createElement('div');
		blockElement.setAttribute('data-id', 'block-1');
		const mediaWrapper = document.createElement('div');
		mediaWrapper.className = 'bn-visual-media-wrapper';
		blockElement.appendChild(mediaWrapper);
		domElement.appendChild(blockElement);

		const editorWithDom = {
			...mockEditor,
			domElement,
		} as unknown as PostWriteBlockNoteEditor;

		const onImportSettled = vi.fn();
		let resolveImport: (value: unknown) => void = () => undefined;
		vi.spyOn(uploadsApi, 'importImage').mockReturnValue(
			new Promise((resolve) => {
				resolveImport = resolve;
			}) as never,
		);

		const { result } = renderHook(() => usePostWriteImageImport({ onImportSettled }));
		const importPromise = result.current.handleImageImport(editorWithDom, 'block-1', 'https://external.test/img.png');

		// 진행 중: 로딩 클래스 및 오버레이 확인
		expect(mediaWrapper.classList.contains('post-write-image-importing')).toBe(true);
		expect(mediaWrapper.querySelector('.post-write-image-import-overlay')).not.toBeNull();

		resolveImport({
			status: 200,
			message: '성공',
			data: {
				objectKey: 'rilog/images/raw/test/imported.webp',
				url: 'https://images.rilog.test/rilog/images/raw/test/imported.webp',
			},
		});

		await importPromise;

		// 완료 후: 로딩 클래스 및 오버레이 제거 확인, 콜백 확인
		expect(mediaWrapper.classList.contains('post-write-image-importing')).toBe(false);
		expect(mediaWrapper.querySelector('.post-write-image-import-overlay')).toBeNull();
		expect(onImportSettled).toHaveBeenCalledTimes(1);
	});

	it('hasPendingImports는 현재 문서의 블록 상태를 기반으로 로딩 여부를 반환한다', async () => {
		vi.spyOn(uploadsApi, 'importImage').mockResolvedValue({
			status: 200,
			message: '성공',
			data: {
				objectKey: 'rilog/images/raw/test/imported.webp',
				url: 'https://images.rilog.test/rilog/images/raw/test/imported.webp',
			},
		});

		const { result } = renderHook(() => usePostWriteImageImport());

		const initialDoc = [{ type: 'image', props: { url: 'https://external.test/img.png' }, children: [] }] as never;
		expect(result.current.hasPendingImports(initialDoc)).toBe(true);

		// 사용자가 블록을 삭제하여 문서가 비면 즉시 false
		expect(result.current.hasPendingImports([])).toBe(false);

		// 임포트 완료된 URL로 갱신된 블록은 false
		await result.current.handleImageImport(mockEditor, 'block-1', 'https://external.test/img.png');
		const updatedDoc = [
			{
				type: 'image',
				props: { url: 'https://images.rilog.test/rilog/images/raw/test/imported.webp' },
				children: [],
			},
		] as never;
		expect(result.current.hasPendingImports(updatedDoc)).toBe(false);
	});

});
