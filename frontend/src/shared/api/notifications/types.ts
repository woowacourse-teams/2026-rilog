export type NotificationFilter = 'ALL' | 'UNREAD';

export type NotificationSourceStatus =
	| 'AVAILABLE'
	| 'POST_DELETED'
	| 'SELECTION_DELETED'
	| 'COMMENT_DELETED'
	| 'ACTOR_DELETED'
	| 'BLOG_DELETED'
	| 'POST_UNAVAILABLE'
	| 'POST_INACCESSIBLE'
	| 'SOURCE_NOT_FOUND';

export type NotificationType = 'POST_INLINE_COMMENT' | 'SELECTION_INLINE_COMMENT' | 'SUBSCRIBED_BLOG_POST_PUBLISHED';

export interface ReadNotificationsRequest {
	filter: NotificationFilter;
	page: number;
	size: number;
}

export interface InlineCommentNotificationContentResponse {
	post: {
		postId: number;
		title: string;
		blogId: number;
		blogSlug: string;
	};
	selection: {
		selectionId: number;
		blockId: string;
		startOffset: number;
		endOffset: number;
		selectedText: string;
		status: 'ACTIVE' | 'ORPHANED';
	};
	commentAnchor: {
		commentAnchorId: number;
		content: string;
	};
	actor: {
		userId: number;
		nickname: string;
		slug: string;
		profileImageUrl: string | null;
	};
}

export interface NotificationItemResponse {
	notificationId: number;
	type: NotificationType;
	read: boolean;
	readAt: string | null;
	createdAt: string;
	sourceStatus: NotificationSourceStatus;
	content: InlineCommentNotificationContentResponse | null;
}

export interface NotificationListResponse {
	notifications: NotificationItemResponse[];
	page: number;
	size: number;
	numberOfElements: number;
	hasNext: boolean;
}
