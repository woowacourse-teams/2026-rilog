import { afterEach, describe, expect, it, vi } from 'vitest';

import { readUserBySlug } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('readUserBySlug', () => {
	it('유저 slug를 경로로 전달하여 유저 정보를 조회한다', async () => {
		const responseBody = {
			status: 0,
			message: 'string',
			data: {
				id: 1,
				nickname: '리로',
				slug: 'jinriro',
				profileImageUrl: 'https://example.com/profile.png',
			},
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await expect(readUserBySlug({ slug: 'jinriro' })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/users/jinriro');
	});

	it('퍼센트 인코딩된 slug도 올바르게 해석해서 요청한다', async () => {
		const responseBody = {
			status: 0,
			message: 'string',
			data: null,
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await readUserBySlug({ slug: 'jinriro 팀' });

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe('https://api.rilog.test/v1/users/jinriro%20%ED%8C%80');
	});

	it('slug의 @ 접두사를 제거해서 요청한다', async () => {
		const responseBody = {
			status: 0,
			message: 'string',
			data: null,
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await readUserBySlug({ slug: '@jinriro' });

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe('https://api.rilog.test/v1/users/jinriro');
	});
});
