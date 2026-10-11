import { afterEach, describe, expect, it, vi } from 'vitest';

import { readNotificationUnreadCount } from './api';

vi.hoisted(() => {
	process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.rilog.test';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('readNotificationUnreadCount', () => {
	it('읽지 않은 수를 지정된 endpoint에서 조회한다', async () => {
		const body = { status: 0, message: 'OK', data: { unreadCount: 3 } };
		const fetchMock = vi.fn().mockResolvedValue(Response.json(body));
		vi.stubGlobal('fetch', fetchMock);

		await expect(readNotificationUnreadCount()).resolves.toEqual(body);
		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('GET');
		expect(request.url).toBe('https://api.rilog.test/v1/notifications/unread-count');
	});
});
