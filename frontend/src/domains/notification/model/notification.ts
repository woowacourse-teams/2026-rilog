import type { BaseBlog } from '@/domains/blog/model/blog';
import type { PostSummary } from '@/domains/post/model/post';
import type { User } from '@/domains/user/model/user';

interface NotificationBase {
	id: number;
	createdAt: string;
	isRead: boolean;
	type: string;
}

interface NotificationPost extends Pick<PostSummary, 'id' | 'title'> {
	/** 게시글이 속한 블로그의 slug. 댓글 작성자의 slug와 다를 수 있다. */
	slug: BaseBlog['slug'];
}

export interface CommentNotification extends NotificationBase {
	type: 'POST_COMMENT' | 'SELECTION_COMMENT';
	author: User;
	post: NotificationPost;
	anchor: {
		id: number;
		content: string;
	};
	comment: {
		id: number;
		content: string;
	};
}

// 새 알림 종류는 개별 모델을 정의한 뒤 이 union에 추가한다.
export type Notification = CommentNotification;
