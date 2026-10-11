import type { NotificationListResponse, NotificationUnreadCountResponse, ReadNotificationsRequest } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';

export const readNotifications = ({ filter, page, size }: ReadNotificationsRequest) =>
	apiClient.get<ApiResponse<NotificationListResponse>>('v1/notifications', {
		searchParams: { filter, page, size },
	});

export const readNotificationUnreadCount = (signal?: AbortSignal) =>
	apiClient.get<ApiResponse<NotificationUnreadCountResponse>>('v1/notifications/unread-count', { signal });
