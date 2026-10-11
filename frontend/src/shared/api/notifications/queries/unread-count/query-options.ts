import { queryOptions } from '@tanstack/react-query';

import { readNotificationUnreadCount } from '../../api';
import { notificationsQueryKeys } from '../keys';

export const notificationUnreadCountQueryOptions = () =>
	queryOptions({
		queryKey: notificationsQueryKeys.unreadCount(),
		queryFn: ({ signal }) => readNotificationUnreadCount(signal),
		refetchInterval: 30_000,
		retry: false,
	});
