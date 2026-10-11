import type { CommentNotification } from '@/domains/notification/model/notification';

import NotificationCommentContent from './NotificationCommentContent';
import NotificationCommentHeader from './NotificationCommentHeader';
import NotificationPostTitle from './NotificationPostTitle';

interface SelectionCommentNotificationContentProps {
	notification: CommentNotification;
	onRead: (id: number) => void;
}

export default function SelectionCommentNotificationContent({
	notification,
	onRead,
}: SelectionCommentNotificationContentProps) {
	const { author, post } = notification;
	return (
		<>
			<NotificationCommentHeader
				author={author}
				createdAt={notification.createdAt}
				summary={
					<>
						<strong className="font-semibold">{author.nickname}</strong> 님이 나와 같은 문장에 댓글을 남겼어요.
					</>
				}
			/>
			<NotificationCommentContent notification={notification} onRead={onRead}>
				<p className="text-caption-1">
					<NotificationPostTitle title={post.title} /> 글에서
				</p>
			</NotificationCommentContent>
		</>
	);
}
