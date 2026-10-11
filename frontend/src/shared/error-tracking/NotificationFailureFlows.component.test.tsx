import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ErrorTrackerContext } from './error-tracker';

import * as notificationsApi from '@/shared/api/notifications/api';
import { useMarkAllNotificationsReadMutation } from '@/shared/api/notifications/mutations/use-mark-all-notifications-read-mutation';
import { useMarkNotificationReadMutation } from '@/shared/api/notifications/mutations/use-mark-notification-read-mutation';
import { notificationListQueryOptions } from '@/shared/api/notifications/queries/notification-list/query-options';
import { notificationUnreadCountQueryOptions } from '@/shared/api/notifications/queries/unread-count/query-options';
import QueryProvider from '@/shared/query/QueryProvider';
import { createApiFailure } from '@/test/fixtures/api-error';

const { captureExceptionMock } = vi.hoisted(() => ({
	captureExceptionMock: vi.fn<(error: unknown, context?: ErrorTrackerContext) => void>(),
}));
vi.mock('@/shared/error-tracking/error-tracker-instance', () => ({
	errorTracker: { captureException: captureExceptionMock, captureMessage: vi.fn(), setUser: vi.fn() },
}));

afterEach(() => {
	vi.restoreAllMocks();
	captureExceptionMock.mockClear();
});

describe('알림 API의 Sentry 보고', () => {
	it.each([
		{
			operation: 'notification.list',
			request: (queryClient: ReturnType<typeof useQueryClient>) =>
				queryClient.fetchInfiniteQuery(notificationListQueryOptions()),
			api: 'readNotifications',
		},
		{
			operation: 'notification.unread-count',
			request: (queryClient: ReturnType<typeof useQueryClient>) =>
				queryClient.fetchQuery(notificationUnreadCountQueryOptions()),
			api: 'readNotificationUnreadCount',
		},
	] as const)('$operation 조회가 최종 실패하면 작업명으로 한 번 보고한다', async ({ operation, request, api }) => {
		const error = await createApiFailure('INTERNAL_SERVER_ERROR', 503);
		vi.spyOn(notificationsApi, api).mockRejectedValue(error);
		const { result } = renderHook(useQueryClient, { wrapper: QueryProvider });

		await expect(request(result.current)).rejects.toBe(error);
		expect(captureExceptionMock).toHaveBeenCalledOnce();
		expect(captureExceptionMock.mock.calls[0]?.[0]).toBe(error.cause);
		expect(captureExceptionMock.mock.calls[0]?.[1]).toMatchObject({ tags: { operation, http_status: '503' } });
	});

	it.each([
		{
			operation: 'notification.read',
			api: 'markNotificationRead',
		},
		{
			operation: 'notification.read-all',
			api: 'markAllNotificationsRead',
		},
	] as const)('$operation 실패는 공통 mutation 보고와 중복 없이 한 번 보고한다', async ({ operation, api }) => {
		const error = await createApiFailure('INTERNAL_SERVER_ERROR', 503);
		vi.spyOn(notificationsApi, api).mockRejectedValue(error);
		const { result } = renderHook(
			() => ({ read: useMarkNotificationReadMutation(), readAll: useMarkAllNotificationsReadMutation() }),
			{ wrapper: QueryProvider },
		);

		await act(async () => {
			await expect(
				api === 'markNotificationRead' ? result.current.read.mutateAsync(42) : result.current.readAll.mutateAsync(),
			).rejects.toBe(error);
		});
		expect(captureExceptionMock).toHaveBeenCalledOnce();
		expect(captureExceptionMock.mock.calls[0]?.[0]).toBe(error.cause);
		expect(captureExceptionMock.mock.calls[0]?.[1]).toMatchObject({ tags: { operation, http_status: '503' } });
	});

	it('존재하지 않는 알림의 읽음 거부는 Sentry에 보고하지 않는다', async () => {
		const error = await createApiFailure('NOTIFICATION_NOT_FOUND', 404);
		vi.spyOn(notificationsApi, 'markNotificationRead').mockRejectedValue(error);
		const { result } = renderHook(useMarkNotificationReadMutation, { wrapper: QueryProvider });

		await act(async () => {
			await expect(result.current.mutateAsync(42)).rejects.toBe(error);
		});
		expect(captureExceptionMock).not.toHaveBeenCalled();
	});
});
