import type { NotificationListResponse, ReadNotificationsRequest } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';


export const readNotifications = ({ filter, page, size }: ReadNotificationsRequest) =>
	apiClient.get<ApiResponse<NotificationListResponse>>('v1/notifications', {
		searchParams: { filter, page, size },
	});
