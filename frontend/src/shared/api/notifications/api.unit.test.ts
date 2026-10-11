import { afterEach, describe, expect, it, vi } from 'vitest';

import { markAllNotificationsRead, markNotificationRead, readNotificationUnreadCount } from './api';

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

describe('markNotificationRead', () => {
	it('알림 ID를 PATCH 경로에 전달한다', async () => {
		const body = { status: 200, message: '알림을 읽음 처리했습니다.', data: null };
		const fetchMock = vi.fn().mockResolvedValue(Response.json(body));
		vi.stubGlobal('fetch', fetchMock);

		await markNotificationRead(42);
		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('PATCH');
		expect(request.url).toBe('https://api.rilog.test/v1/notifications/42/read');
	});

	it('존재하지 않거나 본인 알림이 아니면 NOTIFICATION_NOT_FOUND 오류를 전달한다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json(
					{
						status: 404,
						error: 'Not Found',
						errorCode: 'NOTIFICATION_NOT_FOUND',
						message: '알림을 찾을 수 없습니다.',
						invalidParams: null,
					},
					{ status: 404 },
				),
			),
		);
		await expect(markNotificationRead(42)).rejects.toMatchObject({
			type: 'api',
			detail: { errorCode: 'NOTIFICATION_NOT_FOUND' },
		});
	});
});

describe('markAllNotificationsRead', () => {
	it('로그인 사용자의 모든 알림 읽음을 PATCH로 요청한다', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(Response.json({ status: 200, message: '모든 알림을 읽음 처리했습니다.', data: null }));
		vi.stubGlobal('fetch', fetchMock);

		await markAllNotificationsRead();
		const request = fetchMock.mock.calls[0]?.[0] as Request;
		expect(request.method).toBe('PATCH');
		expect(request.url).toBe('https://api.rilog.test/v1/notifications/read');
	});
});
