import { queryOptions } from '@tanstack/react-query';

import { readNotificationUnreadCount } from '../../api';
import { notificationsQueryKeys } from '../keys';

export const notificationUnreadCountQueryOptions = () =>
	queryOptions({
		queryKey: notificationsQueryKeys.unreadCount(),
		meta: { errorOperation: 'notification.unread-count' },
		queryFn: ({ signal }) => readNotificationUnreadCount(signal),
		refetchInterval: 30_000,
		retry: false,
	});
