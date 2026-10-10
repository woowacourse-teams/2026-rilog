import type { NotificationFilter } from '../types';

export const notificationsQueryKeys = {
	all: ['notifications'] as const,
	list: (filter: NotificationFilter, size: number) => [...notificationsQueryKeys.all, 'list', { filter, size }] as const,
};
