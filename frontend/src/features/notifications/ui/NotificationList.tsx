'use client';

import type { Notification } from '@/domains/notification/model/notification';
import Button from '@/shared/ui/button/Button';
import { parseApiUtcDate } from '@/shared/utils/parse-api-utc-date';

import NotificationItem from './NotificationItem';

type NotificationListProps =
	| { status: 'loading' }
	| { status: 'error'; onRetry: () => void }
	| {
			status: 'success';
			notifications: readonly Notification[];
			onRead: (id: number) => void;
			onReadAll: () => void;
	  };

export default function NotificationList(props: NotificationListProps) {
	if (props.status === 'loading') {
		return (
			<div
				role="status"
				aria-label="알림 불러오는 중"
				className="divide-y divide-border-default border-b border-border-default"
			>
				<span className="sr-only">알림을 불러오는 중입니다.</span>
				{[0, 1, 2].map((id) => (
					<div key={id} aria-hidden="true" className="animate-pulse px-4 py-6 motion-reduce:animate-none sm:px-6">
						<div className="flex items-center gap-3">
							<div className="size-10 rounded-full bg-surface-active" />
							<div className="h-4 w-1/2 rounded bg-surface-active" />
						</div>
						<div className="mt-5 h-24 rounded-lg bg-surface-hover" />
					</div>
				))}
			</div>
		);
	}

	if (props.status === 'error') {
		return (
			<div className="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
				<p role="alert" className="text-body-3 text-text-secondary">
					알림을 불러오지 못했어요.
				</p>
				<Button variant="secondary" onClick={props.onRetry}>
					다시 시도
				</Button>
			</div>
		);
	}

	const { notifications, onRead, onReadAll } = props;
	const unreadCount = notifications.filter((notification) => !notification.isRead).length;
	const visibleNotifications = notifications
		.filter(() => true)
		.sort(
			(first, second) =>
				(parseApiUtcDate(second.createdAt)?.getTime() ?? 0) - (parseApiUtcDate(first.createdAt)?.getTime() ?? 0),
		);

	return (
		<section aria-label="알림 목록">
			<div className="flex flex-wrap items-center justify-end gap-3 border-b border-border-default px-5 pb-4 sm:px-0">
				<Button size="sm" variant="ghost" disabled={unreadCount === 0} onClick={onReadAll}>
					모두 읽음
				</Button>
			</div>
			{visibleNotifications.length === 0 ? (
				<div className="flex min-h-80 flex-col items-center justify-center gap-2 px-4 text-center">
					<p className="text-body-2 font-semibold text-text-primary">아직 도착한 알림이 없어요.</p>
					<p className="text-body-4 text-text-secondary">새로운 소식이 생기면 이곳에 알려드릴게요.</p>
				</div>
			) : (
				<ul className="divide-y divide-border-default border-b border-border-default">
					{visibleNotifications.map((notification) => (
						<li key={notification.id}>
							<NotificationItem notification={notification} onRead={onRead} />
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
