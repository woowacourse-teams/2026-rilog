import type { ReactNode } from 'react';

import { formatNotificationDate } from '@/domains/notification/lib/format-notification-date';
import type { CommentNotification } from '@/domains/notification/model/notification';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { toApiUtcISOString } from '@/shared/utils/parse-api-utc-date';

interface NotificationCommentHeaderProps {
	author: CommentNotification['author'];
	createdAt: string;
	summary: ReactNode;
}

export default function NotificationCommentHeader({ author, createdAt, summary }: NotificationCommentHeaderProps) {
	return (
		<div className="flex items-start gap-3 pr-5">
			<UserAvatar src={author.profileImageUrl} fallback={author.nickname.slice(0, 1)} size="lg" />
			<div className="min-w-0 flex-1">
				<p className="text-body-4 break-words">{summary}</p>
				<time dateTime={toApiUtcISOString(createdAt)} className="mt-1 block text-label-2 text-text-secondary">
					{formatNotificationDate(createdAt)}
				</time>
			</div>
		</div>
	);
}
