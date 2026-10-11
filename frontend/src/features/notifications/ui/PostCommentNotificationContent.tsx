import type { CommentNotification } from '@/domains/notification/model/notification';

import NotificationCommentContent from './NotificationCommentContent';
import NotificationCommentHeader from './NotificationCommentHeader';
import NotificationPostTitle from './NotificationPostTitle';

interface PostCommentNotificationContentProps {
	notification: CommentNotification;
	onRead: () => void;
}

export default function PostCommentNotificationContent({ notification, onRead }: PostCommentNotificationContentProps) {
	const { author, post } = notification;
	return (
		<>
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
			<NotificationCommentContent notification={notification} onRead={onRead} />
		</>
	);
}
