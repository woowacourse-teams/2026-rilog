import type { NotificationFilter } from '../types';

import { authenticatedQueryKeys } from '@/shared/query/authenticated-query-keys';

export const notificationsQueryKeys = {
	all: [...authenticatedQueryKeys.all, 'notifications'] as const,
	unreadCount: () => [...notificationsQueryKeys.all, 'unread-count'] as const,
	lists: () => [...notificationsQueryKeys.all, 'list'] as const,
	list: (filter: NotificationFilter, size: number) => [...notificationsQueryKeys.lists(), { filter, size }] as const,
};
