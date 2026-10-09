'use client';

import { useId, useRef } from 'react';

import { formatNotificationDate } from '@/domains/notification/lib/format-notification-date';
import type { Notification } from '@/domains/notification/model/notification';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { buildPostDetailPath } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import CustomLink from '@/shared/ui/link/CustomLink';
import { toApiUtcISOString } from '@/shared/utils/parse-api-utc-date';

interface NotificationItemProps {
	notification: Notification;
	onRead: (id: number) => void;
}

export default function NotificationItem({ notification, onRead }: NotificationItemProps) {
	const readStatusId = useId();
	const articleRef = useRef<HTMLElement>(null);
	const handleRead = () => {
		// 버튼이 사라져도 현재 행에서 키보드 탐색을 이어가고 스크롤 위치를 유지한다.
		articleRef.current?.focus({ preventScroll: true });
		onRead(notification.id);
	};

	const { type, author, post, anchor, comment, isRead } = notification;
	return (
		<article
			ref={articleRef}
			tabIndex={-1}
			aria-label={`${author.nickname}님의 댓글 알림`}
			aria-describedby={readStatusId}
			className={`px-6 py-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring ${
				isRead ? 'bg-transparent text-text-secondary' : 'bg-focus-ring/5 text-text-primary'
			}`}
		>
			<span id={readStatusId} className="sr-only">
				{isRead ? '읽은 알림' : '읽지 않은 알림'}
			</span>
			<div className="flex items-start gap-3">
				<UserAvatar src={author.profileImageUrl} fallback={author.nickname.slice(0, 1)} size="lg" />
				<div className="min-w-0 flex-1">
					<p className="text-body-4 break-words">
						<strong className="font-semibold">{author.nickname}</strong> 님이{' '}
						{type === 'POST_COMMENT' ? <strong>{post.title}</strong> : '나와 같은 문장'}에 댓글을 남겼어요.
					</p>
					<time
						dateTime={toApiUtcISOString(notification.createdAt)}
						className="mt-1 block text-label-2 text-text-secondary"
					>
						{formatNotificationDate(notification.createdAt)}
					</time>
				</div>
				<span
					aria-hidden="true"
					className={`mt-2 size-1.5 shrink-0 rounded-full bg-danger ${isRead ? 'invisible' : ''}`}
				/>
			</div>
			<CustomLink
				href={buildPostDetailPath(post.slug, String(post.id))}
				aria-label={`${post.title} 게시글로 이동`}
				onNavigate={() => {
					if (!isRead) onRead(notification.id);
				}}
				className="mt-4 block min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring sm:ml-13"
			>
				{type === 'SELECTION_COMMENT' && (
					<p className="text-caption-1">
						<strong className="font-semibold">{post.title}</strong> 글에서
					</p>
				)}
				<blockquote
					className={`mt-3 border-l-2 pl-3 text-body-4 ${isRead ? 'border-border-default text-text-disabled' : 'border-(--quote-border) text-(--quote-text)'}`}
				>
					<p className="line-clamp-2 break-words whitespace-pre-wrap">{anchor.content}</p>
				</blockquote>
				<p
					className={`mt-3 line-clamp-3 text-body-4 break-words whitespace-pre-wrap ${isRead ? 'text-text-disabled' : 'text-text-secondary'}`}
				>
					{comment.content}
				</p>
			</CustomLink>
			{!isRead && (
				<div className="mt-3 flex h-8 justify-end">
					<Button size="sm" variant="ghost" onClick={handleRead}>
						읽음으로 표시
					</Button>
				</div>
			)}
		</article>
	);
}
