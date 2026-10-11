'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

import { markNotificationRead } from '../api';
import { notificationsQueryKeys } from '../queries/keys';

export const useMarkNotificationReadMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (notificationId: number) => markNotificationRead(notificationId),
		retry: false,
		meta: { errorTracking: 'local' },
		onError: (error) => apiErrorReporter.report(error, { operation: 'notification.read' }),
		onSuccess: () => {
			return Promise.all([
				queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() }),
				queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.unreadCount() }),
			]);
		},
	});
};
