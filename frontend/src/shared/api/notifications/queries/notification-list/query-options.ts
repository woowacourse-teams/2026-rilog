import { infiniteQueryOptions } from '@tanstack/react-query';

import { readNotifications } from '../../api';
import type { NotificationFilter, NotificationListResponse } from '../../types';
import { notificationsQueryKeys } from '../keys';

import type { ApiResponse } from '@/shared/api/shared.types';

export const NOTIFICATIONS_PAGE_SIZE = 20;

export interface NotificationListQueryOptions {
	filter?: NotificationFilter;
	size?: number;
}

export const notificationListQueryOptions = ({
	filter = 'ALL',
	size = NOTIFICATIONS_PAGE_SIZE,
}: NotificationListQueryOptions = {}) =>
	infiniteQueryOptions<ApiResponse<NotificationListResponse>>({
		queryKey: notificationsQueryKeys.list(filter, size),
		queryFn: ({ pageParam }) => readNotifications({ filter, page: Number(pageParam), size }),
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const page = lastPage.data?.page;
			return lastPage.data?.hasNext === true && typeof page === 'number' && Number.isSafeInteger(page)
				? page + 1
				: undefined;
		},
		staleTime: 60_000,
		retry: false,
	});
