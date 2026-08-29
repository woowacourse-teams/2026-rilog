import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteColog, removeCologMember } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('deleteColog', () => {
	it('정규화한 팀 slug를 경로로 전달해 DELETE하고 204 응답을 반환한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetchMock);

		const response = await deleteColog('@rilog/team');

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('DELETE');
		expect(request.url).toBe('https://api.rilog.test/v1/cologs/rilog%2Fteam');
		expect(response.status).toBe(204);
	});
});

describe('removeCologMember', () => {
	it('정규화한 팀 slug와 memberId를 경로로 전달해 DELETE하고 204 응답을 반환한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
		vi.stubGlobal('fetch', fetchMock);

		const response = await removeCologMember('@rilog/team', 42);

		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('DELETE');
		expect(request.url).toBe('https://api.rilog.test/v1/cologs/rilog%2Fteam/members/42');
		expect(response.status).toBe(204);
	});
});
