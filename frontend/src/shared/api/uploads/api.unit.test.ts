import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PresignedUrlCreateRequest, PresignedUrlCreateResponse } from './types';

import { createPresignedUrl, uploadFileToPresignedUrl, uploadFileWithPresignedUrl } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

const MOCK_PRESIGNED_RESPONSE: { status: number; message: string; data: PresignedUrlCreateResponse } = {
	status: 200,
	message: 'PresignedUrl을 정상적으로 발급했습니다',
	data: {
		uploadId: 'b38e9b2c-4c13-4f52-9c31-0e52d768d517',
		objectKey: 'rilog/uploads/images/b38e9b2c-4c13-4f52-9c31-0e52d768d517.png',
		uploadUrl: 'https://s3.rilog.test/upload/image.png?signature=xyz',
		headers: {
			'content-type': ['image/png'],
			'x-amz-tagging': ['status=TEMPORARY'],
		},
		expiresAt: '2026-08-19T12:00:00Z',
	},
};

describe('createPresignedUrl', () => {
	it('파일 정보를 JSON 본문에 담아 POST v1/uploads/presigned-url로 요청한다', async () => {
		let capturedRequest: Request | undefined;
		let capturedBody: unknown;

		const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
			if (input instanceof Request) {
				capturedRequest = input;
				capturedBody = await input.clone().json();
			}
			return Response.json(MOCK_PRESIGNED_RESPONSE);
		});
		vi.stubGlobal('fetch', fetchMock);

		const requestPayload: PresignedUrlCreateRequest = {
			fileName: 'avatar.png',
			contentType: 'image/png',
			size: 1024,
			type: 'IMAGE',
		};

		const result = await createPresignedUrl(requestPayload);

		expect(result).toEqual(MOCK_PRESIGNED_RESPONSE);
		expect(capturedRequest?.method).toBe('POST');
		expect(capturedRequest?.url).toBe('https://api.rilog.test/v1/uploads/presigned-url');
		expect(capturedBody).toEqual(requestPayload);
	});
});

describe('uploadFileToPresignedUrl', () => {
	it('지정된 Presigned URL과 헤더로 S3에 파일 바이너리를 PUT 요청한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		const file = new File(['dummy-content'], 'test.png', { type: 'image/png' });
		const uploadUrl = 'https://s3.rilog.test/upload/test.png';
		const headers = {
			'content-type': ['image/png'],
			'x-amz-tagging': ['status=TEMPORARY'],
		};

		await uploadFileToPresignedUrl(uploadUrl, file, headers);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(uploadUrl);
		expect(init.method).toBe('PUT');
		expect(init.body).toBe(file);

		const requestHeaders = init.headers as Headers;
		expect(requestHeaders.get('content-type')).toBe('image/png');
		expect(requestHeaders.get('x-amz-tagging')).toBe('status=TEMPORARY');
	});

	it('headers에 content-type이 누락된 경우 file.type을 기본 Content-Type으로 설정한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		const file = new File(['dummy-content'], 'test.webp', { type: 'image/webp' });
		const uploadUrl = 'https://s3.rilog.test/upload/test.webp';

		await uploadFileToPresignedUrl(uploadUrl, file, {});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		const requestHeaders = init.headers as Headers;
		expect(requestHeaders.get('content-type')).toBe('image/webp');
	});

	it('headers와 file.type이 모두 없으면 application/octet-stream을 fallback으로 사용한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		const file = new File(['dummy-content'], 'test.bin', { type: '' });
		const uploadUrl = 'https://s3.rilog.test/upload/test.bin';

		await uploadFileToPresignedUrl(uploadUrl, file, {});

		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		const requestHeaders = init.headers as Headers;
		expect(requestHeaders.get('content-type')).toBe('application/octet-stream');
	});

	it('S3 업로드가 실패하면 에러를 던진다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 }));
		vi.stubGlobal('fetch', fetchMock);

		const file = new File(['content'], 'test.png', { type: 'image/png' });

		await expect(uploadFileToPresignedUrl('https://s3.rilog.test/forbidden', file)).rejects.toThrow(
			'S3 파일 업로드에 실패했습니다. (HTTP 403)',
		);
	});
});

describe('uploadFileWithPresignedUrl', () => {
	it('Presigned URL을 발급받은 후 S3 업로드까지 순차적으로 성공시킨다', async () => {
		const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
			const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
			if (url.includes('/v1/uploads/presigned-url')) {
				return Promise.resolve(Response.json(MOCK_PRESIGNED_RESPONSE));
			}
			if (url.includes('https://s3.rilog.test/upload')) {
				return Promise.resolve(new Response(null, { status: 200 }));
			}
			return Promise.reject(new Error(`Unexpected URL: ${url}`));
		});
		vi.stubGlobal('fetch', fetchMock);

		const file = new File(['avatar-bytes'], 'avatar.png', { type: 'image/png' });
		const result = await uploadFileWithPresignedUrl({ file, type: 'IMAGE' });

		expect(result).toEqual(MOCK_PRESIGNED_RESPONSE.data);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('Presigned URL 발급 시 data가 없으면 에러를 던진다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(Response.json({ status: 200, message: 'OK', data: null }));
		vi.stubGlobal('fetch', fetchMock);

		const file = new File(['bytes'], 'test.png', { type: 'image/png' });
		await expect(uploadFileWithPresignedUrl({ file, type: 'IMAGE' })).rejects.toThrow(
			'Presigned URL 발급 응답 데이터가 존재하지 않습니다.',
		);
	});
});
