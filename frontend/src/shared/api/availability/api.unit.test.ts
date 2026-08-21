import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkNicknameAvailability, checkSlugAvailability } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('checkSlugAvailability', () => {
	it('slug를 query parameter로 전달하여 사용 가능 여부를 확인한다', async () => {
		const responseBody = {
			status: 200,
			message: '사용가능한 슬러그입니다.',
			data: null,
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await expect(checkSlugAvailability({ slug: 'rilog team' })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/availability/slug?slug=rilog+team');
	});

	it('slug의 @ 접두사를 제거해서 요청한다', async () => {
		const responseBody = {
			status: 200,
			message: '사용가능한 슬러그입니다.',
			data: null,
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await checkSlugAvailability({ slug: '@rilog' });

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.url).toBe('https://api.rilog.test/v1/availability/slug?slug=rilog');
	});

	it('중복된 slug 응답을 API 오류로 정규화한다', async () => {
		const errorBody = {
			status: 404,
			error: 'NOT_FOUND',
			errorCode: 'SLUG_DUPLICATED',
			message: '중복되는 슬러그입니다.',
			invalidParams: null,
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(errorBody, { status: 404 }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(checkSlugAvailability({ slug: 'rilog' })).rejects.toMatchObject({
			type: 'api',
			kind: 'conflict',
			detail: errorBody,
		});
	});
});

describe('checkNicknameAvailability', () => {
	it('nickname을 query parameter로 전달하여 사용 가능 여부를 확인한다', async () => {
		const responseBody = {
			status: 200,
			message: '사용가능한 닉네임입니다.',
			data: null,
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(responseBody));
		vi.stubGlobal('fetch', fetchMock);

		await expect(checkNicknameAvailability({ nickname: '리로그 팀' })).resolves.toEqual(responseBody);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe(
			'https://api.rilog.test/v1/availability/nickname?nickname=%EB%A6%AC%EB%A1%9C%EA%B7%B8+%ED%8C%80',
		);
	});

	it('중복된 nickname 응답을 API 오류로 정규화한다', async () => {
		const errorBody = {
			status: 404,
			error: 'NOT_FOUND',
			errorCode: 'NICKNAME_DUPLICATED',
			message: '중복되는 닉네임입니다.',
			invalidParams: null,
		};
		const fetchMock = vi.fn().mockResolvedValue(Response.json(errorBody, { status: 404 }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(checkNicknameAvailability({ nickname: '리로그' })).rejects.toMatchObject({
			type: 'api',
			kind: 'conflict',
			detail: errorBody,
		});
	});
});
