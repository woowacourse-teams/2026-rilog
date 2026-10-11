import type { Metadata } from 'next';

import { NOTIFICATION_SAMPLES } from '@/features/notifications/model/notification-samples';
import NotificationInbox from '@/features/notifications/ui/NotificationInbox';
import PageShell from '@/shared/ui/page-shell/PageShell';

export const metadata: Metadata = {
	title: '알림',
	robots: { index: false, follow: false },
};

export default function NotificationsPage() {
	return (
		<PageShell
			header={
				<div className="px-5 pt-10 pb-4 sm:px-8 sm:pt-16">
					<h1 className="text-heading-3 font-bold text-text-primary">알림</h1>
				</div>
			}
		>
			<div className="pb-16 sm:px-8">
				<NotificationInbox initialNotifications={NOTIFICATION_SAMPLES} />
			</div>
		</PageShell>
	);
}
