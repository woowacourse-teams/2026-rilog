import { afterEach, describe, expect, it, vi } from 'vitest';

import * as notificationsApi from '@/shared/api/notifications/api';

import { notificationsQueryKeys } from '../keys';

import { notificationUnreadCountQueryOptions } from './query-options';

afterEach(() => vi.restoreAllMocks());

describe('notificationUnreadCountQueryOptions', () => {
	it('인증 cache key로 30초마다 다시 조회하고 실패는 재시도하지 않는다', () => {
		const options = notificationUnreadCountQueryOptions();
		expect(options.queryKey).toEqual(notificationsQueryKeys.unreadCount());
		expect(options.queryKey[0]).toBe('authenticated');
		expect(options.refetchInterval).toBe(30_000);
		expect(options.retry).toBe(false);
	});

	it('요청 취소 signal을 읽지 않은 알림 수 API로 전달한다', async () => {
		const readCount = vi.spyOn(notificationsApi, 'readNotificationUnreadCount').mockResolvedValue({
			status: 0,
			message: 'OK',
			data: { unreadCount: 2 },
		});
		const signal = new AbortController().signal;
		const options = notificationUnreadCountQueryOptions();
		if (typeof options.queryFn !== 'function') throw new Error('queryFn이 설정되어야 합니다.');

		await options.queryFn({ signal } as never);
		expect(readCount).toHaveBeenCalledWith(signal);
	});
});
