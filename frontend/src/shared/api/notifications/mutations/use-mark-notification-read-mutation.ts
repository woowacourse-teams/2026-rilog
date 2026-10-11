'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { markNotificationRead } from '../api';
import { notificationsQueryKeys } from '../queries/keys';

export const useMarkNotificationReadMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (notificationId: number) => markNotificationRead(notificationId),
		retry: false,
		onSuccess: () => {
			return Promise.all([
				queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() }),
				queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.unreadCount() }),
			]);
		},
	});
};
