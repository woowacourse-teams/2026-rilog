import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DraftSaveRequest } from './types';

import { readDraftDetail, readMyDraftList, saveDraft } from './api';

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

describe('readMyDraftList', () => {
	it('0부터 시작하는 page와 size를 query parameter로 전달해 내 임시저장 목록을 조회한다', async () => {
		const responseBody = {
			status: 200,
			message: '임시저장 목록 조회에 성공했습니다.',
			data: {
				drafts: [
					{
						draftId: 42,
						title: '작성 중인 게시글',
						publishedAt: '2026-08-27T10:29:46.466Z',
					},
				],
				page: 0,
				size: 10,
				numberOfElements: 1,
				hasNext: true,
			},
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await expect(readMyDraftList({ page: 0, size: 10 })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/drafts/me?page=0&size=10');
	});
});

describe('readDraftDetail', () => {
	it('draftId를 resource 경로로 전달해 임시저장 상세를 조회한다', async () => {
		const responseBody = {
			status: 200,
			message: '임시저장 글을 성공적으로 불러왔습니다.',
			data: {
				draftId: 42,
				title: '작성 중인 게시글',
				content: [],
				status: 'DRAFT',
				publishedAt: '2026-08-27T10:42:11.852Z',
			},
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await expect(readDraftDetail({ draftId: 42 })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/drafts/42');
	});
});
