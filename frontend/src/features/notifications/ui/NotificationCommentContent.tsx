'use client';

import type { ReactNode } from 'react';

import type { CommentNotification } from '@/domains/notification/model/notification';
import { buildPostDetailPath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

interface NotificationCommentContentProps {
	notification: CommentNotification;
	onRead: (id: number) => void;
	children?: ReactNode;
}

export default function NotificationCommentContent({
	notification,
	onRead,
	children,
}: NotificationCommentContentProps) {
	const { post, anchor, comment, isRead } = notification;
	return (
		<CustomLink
			href={buildPostDetailPath(post.slug, String(post.id))}
			aria-label={`${post.title} 게시글로 이동`}
			onNavigate={() => {
				if (!isRead) onRead(notification.id);
			}}
			className="mt-4 block min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring sm:ml-13"
		>
			{children}
			<blockquote
				className={`mt-3 border-l-2 pl-3 text-body-4 ${isRead ? 'border-border-default text-text-disabled' : 'border-(--quote-border) text-(--quote-text)'}`}
			>
				<p className="line-clamp-2 break-words whitespace-pre-wrap">{anchor.content}</p>
			</blockquote>
			<p
				className={`mt-3 line-clamp-2 text-body-4 break-words whitespace-pre-wrap ${isRead ? 'text-text-disabled' : 'text-text-secondary'}`}
			>
				{comment.content}
			</p>
		</CustomLink>
	);
}
