import { afterEach, describe, expect, it, vi } from 'vitest';

import { completeOnboarding, readMyCologsOverview, readMyInfo, readUserBySlug } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

it.each([
	{ operation: '내 정보 조회', request: () => readMyInfo() },
	{ operation: '온보딩 완료', request: () => completeOnboarding({ nickname: '리로그', slug: 'rilog' }) },
])('$operation 성공 응답이 잘못된 JSON이면 검증 오류를 반환한다', async ({ request }) => {
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{broken', { status: 200 })));
	await expect(request()).rejects.toMatchObject({ type: 'unknown', cause: { name: 'InvalidApiResponseError' } });
});

describe('readMyCologsOverview', () => {
	it('내 코로그와 챕터 요약을 overview endpoint에서 조회한다', async () => {
		const responseBody = {
			status: 200,
			message: '나의 팀 목록 요약 조회에 성공했습니다.',
			data: [
				{
					cologId: 20,
					slug: 'rilog-team',
					name: 'Rilog Team',
					profileImageUrl: 'cologs/rilog-team.png',
					chapters: [{ chapterId: 12, name: '제품 개발', order: 0 }],
				},
			],
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await expect(readMyCologsOverview()).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/users/me/cologs/overview');
	});
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
			serviceUrl: 'https://www.rilog.kr',
			githubUrl: 'https://github.com/rilog',
		};

		await expect(completeOnboarding(requestBody)).resolves.toMatchObject({ accessToken: 'access-token' });

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('PATCH');
		expect(request.url).toBe('https://api.rilog.test/v1/users/me/onboarding');
		expect(capturedBody).toEqual(requestBody);
	});

	it('응답 본문이 null 계약을 어기거나 토큰이 빠지면 완료 결과를 반환하지 않는다', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json(
					{ status: 200, message: 'success', data: { unexpected: true } },
					{ headers: { Authorization: 'Bearer access-token' } },
				),
			)
			.mockResolvedValueOnce(Response.json({ status: 200, message: 'success', data: null }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(completeOnboarding({ nickname: '리로그', slug: 'rilog' })).rejects.toMatchObject({
			type: 'unknown',
			cause: { name: 'InvalidApiResponseError' },
		});
		await expect(completeOnboarding({ nickname: '리로그', slug: 'rilog' })).rejects.toMatchObject({
			type: 'unknown',
			cause: { name: 'InvalidApiResponseError' },
		});
	});
});

describe('readMyInfo', () => {
	it('내 정보의 필수 필드가 온전할 때만 응답을 반환한다', async () => {
		const valid = {
			status: 200,
			message: 'success',
			data: { id: 1, slug: 'rilog', nickname: '리로그', profileImageUrl: null },
		};
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(Response.json(valid))
			.mockResolvedValueOnce(Response.json({ ...valid, data: { ...valid.data, profileImageUrl: 7 } }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(readMyInfo()).resolves.toEqual(valid);
		await expect(readMyInfo()).rejects.toMatchObject({
			type: 'unknown',
			cause: { name: 'InvalidApiResponseError' },
		});
		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe('https://api.rilog.test/v1/users/me');
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
