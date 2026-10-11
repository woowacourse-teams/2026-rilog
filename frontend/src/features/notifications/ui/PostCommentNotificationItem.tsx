import type { CommentNotification } from '@/domains/notification/model/notification';

import NotificationCommentContent from './NotificationCommentContent';
import NotificationCommentHeader from './NotificationCommentHeader';
import NotificationItemLayout from './NotificationItemLayout';
import NotificationPostTitle from './NotificationPostTitle';

interface PostCommentNotificationItemProps {
	notification: CommentNotification;
	isReadPending: boolean;
	onRead: () => void;
	onReadButton: () => void;
}

export default function PostCommentNotificationItem({
	notification,
	isReadPending,
	onRead,
	onReadButton,
}: PostCommentNotificationItemProps) {
	const { author, post } = notification;
	return (
		<NotificationItemLayout
			isRead={notification.isRead}
			isReadPending={isReadPending}
			onRead={onReadButton}
			accessibleLabel={`${author.nickname}님의 댓글 알림`}
			header={
				<NotificationCommentHeader
					author={author}
					createdAt={notification.createdAt}
					summary={
						<>
							<strong className="font-semibold">{author.nickname}</strong> 님이{' '}
							<NotificationPostTitle
								title={post.title}
								isStruckThrough={notification.state === 'post-deleted' || notification.state === 'post-inaccessible'}
							/>
							에 댓글을 남겼어요.
						</>
					}
				/>
			}
			content={<NotificationCommentContent notification={notification} onRead={onRead} />}
		/>
	);
}
