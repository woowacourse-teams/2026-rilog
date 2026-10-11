'use client';

import type { ReactNode } from 'react';

import type { CommentNotification } from '@/domains/notification/model/notification';
import { analytics } from '@/features/analytics/model/events';
import { buildPostDetailSelectionPath } from '@/shared/routes/app-routes';
import { appendSearchParams } from '@/shared/routes/append-search-params';
import CustomLink from '@/shared/ui/link/CustomLink';

import NotificationNavigationStatus from './NotificationNavigationStatus';

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
	const isPostUnavailable = notification.state === 'post-deleted' || notification.state === 'post-inaccessible';
	const isCommentDeleted = notification.state === 'comment-deleted';
	const destination = buildPostDetailSelectionPath(post.slug, String(post.id), anchor.id);

	return (
		<CustomLink
			href={isCommentDeleted ? appendSearchParams(destination, { notificationCommentDeleted: 'true' }) : destination}
			aria-label={`${post.title} 게시글의 댓글 보기`}
			onClick={() => analytics.notificationItemOpened({ notification })}
			onNavigate={() => {
				if (!isRead) onRead(notification.id);
			}}
			className={`mt-4 block min-w-0 after:absolute after:inset-0 after:z-0 after:bg-transparent after:transition-colors after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus-ring motion-reduce:after:transition-none sm:ml-13 ${isRead ? 'hover:after:bg-surface-hover/20 active:after:bg-surface-active/20' : 'hover:after:bg-background/30 active:after:bg-surface-active/30'}`}
		>
			{children}
			<blockquote
				className={`mt-3 border-l-2 pl-3 text-body-4 ${isRead ? 'border-border-default text-text-disabled' : 'border-(--quote-border) text-(--quote-text)'}`}
			>
				<p className={`line-clamp-2 break-words whitespace-pre-wrap ${isPostUnavailable ? 'line-through' : ''}`}>
					{anchor.content}
				</p>
			</blockquote>
			<p
				className={`mt-3 line-clamp-2 text-body-4 break-words whitespace-pre-wrap ${isRead ? 'text-text-disabled' : 'text-text-secondary'} ${isPostUnavailable || isCommentDeleted ? 'line-through' : ''}`}
			>
				{comment.content}
			</p>
			<NotificationNavigationStatus />
		</CustomLink>
	);
}
