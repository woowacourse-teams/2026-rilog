import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PostWriteBlockNoteEditor } from '../lib/post-write-schema';

import { usePostWriteUpload } from './use-post-write-upload';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('usePostWriteUpload', () => {
	it('본문 SVG 업로드는 정제를 한 번 실행하고 저장소에 전송한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		const { uploadFileWithPresignedUrl } = await import('@/shared/api/uploads/api');
		const file = new File(
			['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="1" height="1"/></svg>'],
			'icon.svg',
			{ type: 'image/svg+xml' },
		);
		const readText = vi.spyOn(file, 'text');
		const serializeSvg = vi.spyOn(XMLSerializer.prototype, 'serializeToString');
		const fetchMock = vi.fn((input: RequestInfo | URL) => {
			const request = input as Request;
			if (request.url.includes('/v1/uploads/presigned-url')) {
				return Promise.resolve(
					Response.json({
						status: 200,
						message: 'OK',
						data: {
							uploadId: 'svg-upload',
							objectKey: 'posts/icon.svg',
							uploadUrl: 'https://s3.rilog.test/upload/icon.svg',
							headers: {},
							expiresAt: '2026-08-19T12:00:00Z',
						},
					}),
				);
			}
			if (request.url.includes('https://s3.rilog.test/upload/icon.svg')) {
				return Promise.resolve(new Response(null, { status: 200 }));
			}
			throw new Error(`Unexpected URL: ${request.url}`);
		});
		vi.stubGlobal('fetch', fetchMock);
		const uploadFile = async (image: File) => {
			const response = await uploadFileWithPresignedUrl({ file: image, type: 'IMAGE' });
			return response.objectKey;
		};
		const { result } = renderHook(() => usePostWriteUpload(uploadFile));
		act(() => {
			result.current.connectEditor({ getBlock: () => ({ type: 'image' }) } as unknown as PostWriteBlockNoteEditor);
		});

		let uploadedUrl: string | Record<string, unknown> | undefined;
		await act(async () => {
			uploadedUrl = await result.current.uploadFileWithFeedback(file, 'image-block');
		});

		expect(uploadedUrl).toBe('posts/icon.svg');
		expect(readText).toHaveBeenCalledOnce();
		expect(serializeSvg).toHaveBeenCalledOnce();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
