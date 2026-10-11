import type { ReactNode } from 'react';

import type { Notification } from '@/domains/notification/model/notification';
import { analytics } from '@/features/analytics/model/events';

import NotificationItemLayout from './NotificationItemLayout';
import PostCommentNotificationContent from './PostCommentNotificationContent';
import SelectionCommentNotificationContent from './SelectionCommentNotificationContent';

interface NotificationItemProps {
	notification: Notification;
	isReadPending: boolean;
	onRead: (id: number) => void;
}

export default function NotificationItem({ notification, isReadPending, onRead }: NotificationItemProps) {
	let content: ReactNode;
	let accessibleLabel: string;
	const handleNavigationRead = () => onRead(notification.id);

	switch (notification.type) {
		case 'POST_COMMENT':
			content = <PostCommentNotificationContent notification={notification} onRead={handleNavigationRead} />;
			accessibleLabel = `${notification.author.nickname}님의 댓글 알림`;
			break;
		case 'SELECTION_COMMENT':
			content = <SelectionCommentNotificationContent notification={notification} onRead={handleNavigationRead} />;
			accessibleLabel = `${notification.author.nickname}님의 댓글 알림`;
			break;
	}

	return (
		<li>
			<NotificationItemLayout
				isRead={notification.isRead}
				isReadPending={isReadPending}
				onRead={() => {
					analytics.notificationReadButtonClicked({ notification });
					onRead(notification.id);
				}}
				accessibleLabel={accessibleLabel}
				content={content}
			/>
		</li>
	);
}
