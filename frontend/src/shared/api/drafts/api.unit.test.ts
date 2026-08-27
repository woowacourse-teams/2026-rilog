import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DraftSaveRequest } from './types';

import { saveDraft } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('saveDraft', () => {
	it('게시글 제목과 본문을 JSON 본문에 담아 POST v1/drafts로 요청한다', async () => {
		const responseBody = {
			status: 201,
			message: '최초 임시저장에 성공했습니다.',
			data: { draftId: 42 },
		};
		let capturedBody: unknown;
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			if (input instanceof Request) {
				capturedBody = await input.clone().json();
			}

			return Response.json(responseBody, { status: 201 });
		});
		vi.stubGlobal('fetch', fetchMock);
		const requestBody: DraftSaveRequest = {
			title: '작성 중인 게시글',
			content: [],
		};

		await expect(saveDraft(requestBody)).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('POST');
		expect(request.url).toBe('https://api.rilog.test/v1/drafts');
		expect(capturedBody).toEqual(requestBody);
	});
});
