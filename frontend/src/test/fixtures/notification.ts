import type { Notification } from '@/domains/notification/model/notification';

export function createNotification(overrides: Partial<Notification> = {}): Notification {
	return {
		id: 1,
		type: 'POST_COMMENT',
		createdAt: '2026-10-08T08:21:00Z',
		isRead: false,
		author: { id: 11, slug: 'comment-author', nickname: '작성자', profileImageUrl: null },
		post: { id: 101, slug: 'post-blog', title: '테스트 게시글' },
		anchor: { id: 201, content: '댓글이 달린 문장' },
		comment: { id: 301, content: '알림에 표시할 댓글' },
		...overrides,
	};
}
