import { afterEach, describe, expect, it, vi } from 'vitest';

import { completeOnboarding, readUserBySlug } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('completeOnboarding', () => {
	it('소셜 링크를 포함한 온보딩 정보를 PATCH하고 access token을 반환한다', async () => {
		let capturedBody: unknown;
		const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
			const request = input as Request;
			capturedBody = await request.clone().json();

			return Response.json(
				{ status: 200, message: '온보딩을 완료했습니다.', data: null },
				{ headers: { Authorization: 'Bearer access-token' } },
			);
		});
		vi.stubGlobal('fetch', fetchMock);
		const requestBody = {
			nickname: '리로그',
			slug: 'rilog',
			serviceUrl: 'https://rilog.kr',
			githubUrl: 'https://github.com/rilog',
		};

		await expect(completeOnboarding(requestBody)).resolves.toMatchObject({ accessToken: 'access-token' });

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('PATCH');
		expect(request.url).toBe('https://api.rilog.test/v1/users/me/onboarding');
		expect(capturedBody).toEqual(requestBody);
	});
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
