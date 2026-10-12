import { describe, expect, it } from 'vitest';

import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';

import { notificationsQueryKeys } from './keys';

describe('notificationsQueryKeys', () => {
	it('알림 목록을 인증 캐시에 포함하고 필터와 페이지 크기별로 구분한다', () => {
		expect(notificationsQueryKeys.list('ALL', 20)).toEqual([
			...authenticatedQueryKeys.all,
			'notifications',
			'list',
			{ filter: 'ALL', size: 20 },
		]);
		expect(notificationsQueryKeys.list('ALL', 20)).not.toEqual(notificationsQueryKeys.list('UNREAD', 20));
		expect(notificationsQueryKeys.list('ALL', 20)).not.toEqual(notificationsQueryKeys.list('ALL', 10));
	});
});
