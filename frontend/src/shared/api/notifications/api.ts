import type { NotificationListResponse, NotificationUnreadCountResponse, ReadNotificationsRequest } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';

export const readNotifications = ({ filter, page, size }: ReadNotificationsRequest) =>
	apiClient.get<ApiResponse<NotificationListResponse>>('v1/notifications', {
		searchParams: { filter, page, size },
	});

export const readNotificationUnreadCount = (signal?: AbortSignal) =>
	apiClient.get<ApiResponse<NotificationUnreadCountResponse>>('v1/notifications/unread-count', { signal });

export const markNotificationRead = (notificationId: number) =>
	apiClient.patch<ApiResponse<null>>(`v1/notifications/${notificationId}/read`);

export const markAllNotificationsRead = () => apiClient.patch<ApiResponse<null>>('v1/notifications/read');
