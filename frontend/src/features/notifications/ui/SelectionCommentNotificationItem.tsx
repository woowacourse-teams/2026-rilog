import type { CommentNotification } from '@/domains/notification/model/notification';

import NotificationCommentContent from './NotificationCommentContent';
import NotificationCommentHeader from './NotificationCommentHeader';
import NotificationItemLayout from './NotificationItemLayout';
import NotificationPostTitle from './NotificationPostTitle';

interface SelectionCommentNotificationItemProps {
	notification: CommentNotification;
	isReadPending: boolean;
	onRead: (id: number) => void;
}

export default function SelectionCommentNotificationItem({
	notification,
	isReadPending,
	onRead,
}: SelectionCommentNotificationItemProps) {
	const { author, post } = notification;

	return (
		<NotificationItemLayout
			notification={notification}
			isReadPending={isReadPending}
			onRead={onRead}
			accessibleLabel={`${author.nickname}님의 댓글 알림`}
			header={
				<NotificationCommentHeader
					author={author}
					createdAt={notification.createdAt}
					summary={
						<>
							<strong className="font-semibold">{author.nickname}</strong> 님이 나와 같은 문장에 댓글을 남겼어요.
						</>
					}
				/>
			}
			content={
				<NotificationCommentContent notification={notification} onRead={onRead}>
					<p className="text-caption-1">
						<NotificationPostTitle
							title={post.title}
							isStruckThrough={notification.state === 'post-deleted' || notification.state === 'post-inaccessible'}
						/>{' '}
						글에서
					</p>
				</NotificationCommentContent>
			}
		/>
	);
}
