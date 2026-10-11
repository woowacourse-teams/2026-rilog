'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import type { NotificationListQueryOptions } from './query-options';

import { notificationListQueryOptions } from './query-options';

interface UseNotificationListQueryOptions extends NotificationListQueryOptions {
	isEnabled?: boolean;
}

export const useNotificationListQuery = ({ isEnabled = true, ...options }: UseNotificationListQueryOptions = {}) =>
	useInfiniteQuery({ ...notificationListQueryOptions(options), enabled: isEnabled });
