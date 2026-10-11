'use client';

import { useEffect, useMemo, useRef } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import { useLoginModal } from '@/features/login/model/use-login-modal';
import { useMarkAllNotificationsReadMutation } from '@/shared/api/notifications/mutations/use-mark-all-notifications-read-mutation';
import { useMarkNotificationReadMutation } from '@/shared/api/notifications/mutations/use-mark-notification-read-mutation';
import { useNotificationListQuery } from '@/shared/api/notifications/queries/notification-list/use-query';
import Button from '@/shared/ui/button/Button';

import { mapNotifications } from '../lib/map-notifications';

import NotificationList from './NotificationList';

export default function NotificationInbox() {
	const { isAuthenticated, isInitialized } = useAuth();
	const login = useLoginModal();

	const query = useNotificationListQuery({ isEnabled: isInitialized && isAuthenticated });
	const { fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query;
	const sentinelRef = useRef<HTMLDivElement>(null);
	const markRead = useMarkNotificationReadMutation();
	const markAllRead = useMarkAllNotificationsReadMutation();
	const isReadPending = markRead.isPending || markAllRead.isPending;

	const notifications = useMemo(() => {
		const items = query.data?.pages.flatMap((page) => page.data?.notifications ?? []) ?? [];
		const mapped = mapNotifications(items);
		const unique = new Map(mapped.map((notification) => [notification.id, notification]));
		return Array.from(unique.values());
	}, [query.data?.pages]);

	useEffect(() => {
		if (!hasNextPage || isFetchingNextPage || isFetchNextPageError) return;
		if (notifications.length === 0) {
			void fetchNextPage();
			return;
		}
		const sentinel = sentinelRef.current;
		if (sentinel === null) return;

		let hasRequestedNextPage = false;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !hasRequestedNextPage) {
					hasRequestedNextPage = true;
					observer.disconnect();
					void fetchNextPage();
				}
			},
			{ rootMargin: '300px 0px' },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError, notifications.length]);

	if (!isInitialized) return <NotificationList status="loading" />;

	if (!isAuthenticated) {
		return (
			<div className="flex min-h-80 flex-col items-center justify-center gap-4 px-4 text-center">
				<p className="text-body-3 text-text-secondary">로그인하고 나에게 온 알림을 확인해 보세요.</p>
				<Button onClick={() => login()}>로그인</Button>
			</div>
		);
	}
	if (query.isPending) return <NotificationList status="loading" />;
	if (query.isError && !isFetchNextPageError && notifications.length === 0)
		return <NotificationList status="error" onRetry={() => void query.refetch()} />;
	if (isFetchNextPageError && notifications.length === 0)
		return <NotificationList status="error" onRetry={() => void query.fetchNextPage()} />;

	return (
		<>
			{markRead.isError && (
				<p role="alert" className="px-5 pb-3 text-body-4 text-danger-text">
					알림을 읽음 처리하지 못했어요. 다시 시도해 주세요.
				</p>
			)}
			{markAllRead.isError && (
				<p role="alert" className="px-5 pb-3 text-body-4 text-danger-text">
					모든 알림을 읽음 처리하지 못했어요. 다시 시도해 주세요.
				</p>
			)}
			{notifications.length === 0 && hasNextPage ? (
				<NotificationList status="loading" />
			) : (
				<NotificationList
					status="success"
					notifications={notifications}
					isReadPending={isReadPending}
					onRead={(id) => markRead.mutate(id)}
					onReadAll={() => markAllRead.mutate()}
				/>
			)}
			<div ref={sentinelRef} aria-hidden="true" className="h-px" />
			{(isFetchingNextPage || isFetchNextPageError) && (
				<div className="flex min-h-20 flex-col items-center justify-center gap-3" aria-live="polite">
					{isFetchingNextPage && <p className="text-body-4 text-text-secondary">알림을 더 불러오는 중...</p>}
					{isFetchNextPageError && (
						<>
							<p role="alert" className="text-body-4 text-text-secondary">
								다음 알림을 불러오지 못했어요.
							</p>
							<Button variant="secondary" onClick={() => void query.fetchNextPage()}>
								다시 시도
							</Button>
						</>
					)}
				</div>
			)}
		</>
	);
}
