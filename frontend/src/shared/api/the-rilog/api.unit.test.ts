import { afterEach, describe, expect, it, vi } from 'vitest';

import { getApiRequestDiagnostics } from '@/shared/api/request-diagnostics';
import { createTheRilogFixtureData } from '@/test/fixtures/the-rilog';

import { readTheRilog } from './api';
import { isTheRilogResponse } from './response-guards';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('readTheRilog', () => {
	it('공개 매거진 endpoint로 조회해 검증된 데이터와 응답 envelope를 반환한다', async () => {
		const body = { status: 200, message: 'OK', data: createTheRilogFixtureData() };
		const fetchMock = vi.fn((request: Request) => {
			expect(request.method).toBe('GET');
			expect(request.url).toBe('https://api.rilog.test/v1/the-rilog');
			return Promise.resolve(Response.json(body));
		});
		vi.stubGlobal('fetch', fetchMock);
		await expect(readTheRilog()).resolves.toEqual(body);
	});

	it.each([
		{ status: 200, message: 'OK', data: null },
		{
			status: 200,
			message: 'OK',
			data: {
				...createTheRilogFixtureData(),
				news: { ...createTheRilogFixtureData().news, postId: '100' },
			},
		},
		{
			status: 200,
			message: 'OK',
			data: {
				...createTheRilogFixtureData(),
				spotlights: [{ ...createTheRilogFixtureData().spotlights[0], articleType: 'unknown' }],
			},
		},
	])('손상된 응답을 반환하지 않고 원래 GET 요청 정보를 유지한다', async (body) => {
		const fetchMock = vi.fn(() => Promise.resolve(Response.json(body)));
		vi.stubGlobal('fetch', fetchMock);
		const request = readTheRilog();
		await expect(request).rejects.toMatchObject({ type: 'unknown', cause: { name: 'InvalidApiResponseError' } });
		await expect(request.catch((error: { cause: unknown }) => getApiRequestDiagnostics(error.cause))).resolves.toEqual({
			method: 'GET',
			url: 'https://api.rilog.test/v1/the-rilog',
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('잘못된 JSON을 정상 빈 매거진으로 바꾸거나 재요청하지 않는다', async () => {
		const fetchMock = vi.fn(() => Promise.resolve(new Response('{broken', { status: 200 })));
		vi.stubGlobal('fetch', fetchMock);
		await expect(readTheRilog()).rejects.toMatchObject({ type: 'unknown', cause: { name: 'InvalidApiResponseError' } });
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('isTheRilogResponse', () => {
	it('뉴스와 날짜가 없는 정상 빈 결과를 허용한다', () => {
		expect(isTheRilogResponse(createTheRilogFixtureData({ date: null, news: null, spotlights: [] }))).toBe(true);
	});

	it.each([
		{ sourceProfileName: 1, sourceProfileImage: null },
		{ sourceProfileName: '출처', sourceProfileImage: false },
	])('출처의 형식이 잘못되면 거부한다', (source) => {
		const data = createTheRilogFixtureData();
		expect(isTheRilogResponse({ ...data, spotlights: [{ ...data.spotlights[0], source }] })).toBe(false);
	});
});
