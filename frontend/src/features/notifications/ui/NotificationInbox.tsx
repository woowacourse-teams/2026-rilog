'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import { useLoginModal } from '@/features/login/model/use-login-modal';
import { useNotificationListQuery } from '@/shared/api/notifications/queries/notification-list/use-query';
import Button from '@/shared/ui/button/Button';

import { mapNotifications } from '../lib/map-notifications';

import NotificationList from './NotificationList';

export default function NotificationInbox() {
	const { isAuthenticated, isInitialized } = useAuth();
	const login = useLoginModal();
	const [locallyReadIds, setLocallyReadIds] = useState<ReadonlySet<number>>(() => new Set());
	const sentinelRef = useRef<HTMLDivElement>(null);
	const query = useNotificationListQuery({ isEnabled: isInitialized && isAuthenticated });
	const { fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError } = query;
	const notifications = useMemo(() => {
		const items = query.data?.pages.flatMap((page) => page.data?.notifications ?? []) ?? [];
		const mapped = mapNotifications(items);
		const unique = new Map(mapped.map((notification) => [notification.id, notification]));
		return Array.from(unique.values()).map((notification) =>
			locallyReadIds.has(notification.id) ? { ...notification, isRead: true } : notification,
		);
	}, [query.data?.pages, locallyReadIds]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (sentinel === null || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return;

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
	}, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError]);

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

	return (
		<>
			{notifications.length === 0 && hasNextPage ? (
				<NotificationList status="loading" />
			) : (
				<NotificationList
					status="success"
					notifications={notifications}
					onRead={(id) => setLocallyReadIds((current) => new Set([...current, id]))}
					onReadAll={() => setLocallyReadIds((current) => new Set([...current, ...notifications.map(({ id }) => id)]))}
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
