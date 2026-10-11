import { describe, expect, it } from 'vitest';

import { notificationsQueryKeys } from '../keys';

import { notificationListQueryOptions } from './query-options';

describe('notificationListQueryOptions', () => {
	it('필터와 크기를 cache key에 포함하고 목록 실패의 작업명을 제공한다', () => {
		const options = notificationListQueryOptions({ filter: 'UNREAD', size: 10 });

		expect(options.queryKey).toEqual(notificationsQueryKeys.list('UNREAD', 10));
		expect(options.meta).toEqual({ errorOperation: 'notification.list' });
		expect(options.retry).toBe(false);
	});

	it('다음 페이지가 있으면 서버의 현재 페이지 다음 번호를 사용한다', () => {
		const options = notificationListQueryOptions();
		expect(
			options.getNextPageParam(
				{
					status: 200,
					message: 'OK',
					data: { notifications: [], page: 2, size: 20, numberOfElements: 0, hasNext: true },
				},
				[],
				2,
				[],
			),
		).toBe(3);
	});
});
