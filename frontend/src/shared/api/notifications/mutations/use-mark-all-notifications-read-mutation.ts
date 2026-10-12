'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

import { markAllNotificationsRead } from '../api';
import { notificationsQueryKeys } from '../queries/keys';

export const useMarkAllNotificationsReadMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: markAllNotificationsRead,
		retry: false,
		meta: { errorTracking: 'local' },
		onError: (error) => apiErrorReporter.report(error, { operation: 'notification.read-all' }),
		onSuccess: () => {
			return Promise.all([
				queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() }),
				queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.unreadCount() }),
			]);
		},
	});
};
