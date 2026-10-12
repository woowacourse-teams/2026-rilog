import type { Notification } from '@/domains/notification/model/notification';

import PostCommentNotificationItem from './PostCommentNotificationItem';
import SelectionCommentNotificationItem from './SelectionCommentNotificationItem';

interface NotificationItemProps {
	notification: Notification;
	isReadPending: boolean;
	onRead: (id: number) => void;
}

export default function NotificationItem({ notification, isReadPending, onRead }: NotificationItemProps) {
	switch (notification.type) {
		case 'POST_COMMENT':
			return <PostCommentNotificationItem notification={notification} isReadPending={isReadPending} onRead={onRead} />;
		case 'SELECTION_COMMENT':
			return (
				<SelectionCommentNotificationItem notification={notification} isReadPending={isReadPending} onRead={onRead} />
			);
	}
}
