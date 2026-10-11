import type { Notification } from '@/domains/notification/model/notification';
import { analytics } from '@/features/analytics/model/events';

import PostCommentNotificationItem from './PostCommentNotificationItem';
import SelectionCommentNotificationItem from './SelectionCommentNotificationItem';

interface NotificationItemProps {
	notification: Notification;
	isReadPending: boolean;
	onRead: (id: number) => void;
}

export default function NotificationItem({ notification, isReadPending, onRead }: NotificationItemProps) {
	const handleNavigationRead = () => onRead(notification.id);
	const handleButtonRead = () => {
		analytics.notificationReadButtonClicked({ notification });
		onRead(notification.id);
	};

	switch (notification.type) {
		case 'POST_COMMENT':
			return (
				<PostCommentNotificationItem
					notification={notification}
					isReadPending={isReadPending}
					onRead={handleNavigationRead}
					onReadButton={handleButtonRead}
				/>
			);
		case 'SELECTION_COMMENT':
			return (
				<SelectionCommentNotificationItem
					notification={notification}
					isReadPending={isReadPending}
					onRead={handleNavigationRead}
					onReadButton={handleButtonRead}
				/>
			);
	}
}
