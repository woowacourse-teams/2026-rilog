import type { CommentNotification, Notification } from '@/domains/notification/model/notification';
import type {
	InlineCommentNotificationContentResponse,
	NotificationItemResponse,
	NotificationSourceStatus,
} from '@/shared/api/notifications/types';

const mapInlineCommentState = (status: NotificationSourceStatus): CommentNotification['state'] | null => {
	switch (status) {
		case 'AVAILABLE':
			return 'available';
		case 'POST_DELETED':
		case 'BLOG_DELETED':
			return 'post-deleted';
		case 'SELECTION_DELETED':
		case 'COMMENT_DELETED':
		case 'ACTOR_DELETED':
			return 'comment-deleted';
		case 'POST_INACCESSIBLE':
			return 'post-inaccessible';
		case 'POST_UNAVAILABLE':
		case 'SOURCE_NOT_FOUND':
			return null;
	}
};

const mapInlineCommentNotification = (
	item: NotificationItemResponse,
	content: InlineCommentNotificationContentResponse,
): CommentNotification | null => {
	const state = mapInlineCommentState(item.sourceStatus);
	if (state === null) return null;

	return {
		id: item.notificationId,
		type: item.type === 'POST_INLINE_COMMENT' ? 'POST_COMMENT' : 'SELECTION_COMMENT',
		state,
		createdAt: item.createdAt,
		isRead: item.read,
		author: {
			id: content.actor.userId,
			slug: content.actor.slug,
			nickname: content.actor.nickname,
			profileImageUrl: content.actor.profileImageUrl,
		},
		post: { id: content.post.postId, slug: content.post.blogSlug, title: content.post.title },
		anchor: { id: content.selection.selectionId, content: content.selection.selectedText },
		comment: { id: content.commentAnchor.commentAnchorId, content: content.commentAnchor.content },
	};
};

export const mapNotifications = (items: readonly NotificationItemResponse[]): Notification[] =>
	items.flatMap((item) => {
		const { content } = item;
		if (content === null) return [];

		switch (item.type) {
			case 'POST_INLINE_COMMENT':
			case 'SELECTION_INLINE_COMMENT': {
				const notification = mapInlineCommentNotification(item, content);
				return notification === null ? [] : [notification];
			}
			case 'SUBSCRIBED_BLOG_POST_PUBLISHED':
				// 이 타입의 content 계약과 UI는 아직 제공되지 않는다.
				return [];
		}
	});
