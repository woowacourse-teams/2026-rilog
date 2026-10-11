'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { markAllNotificationsRead } from '../api';
import { notificationsQueryKeys } from '../queries/keys';

export const useMarkAllNotificationsReadMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: markAllNotificationsRead,
		retry: false,
		onSuccess: () => {
			void Promise.all([
				queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.lists() }),
				queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.unreadCount() }),
			]);
		},
	});
};
