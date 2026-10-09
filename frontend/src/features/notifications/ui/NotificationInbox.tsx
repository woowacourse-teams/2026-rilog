'use client';

import { useState } from 'react';

import type { Notification } from '@/domains/notification/model/notification';
import { useAuth } from '@/features/auth/model/use-auth';
import { useLoginModal } from '@/features/login/model/use-login-modal';
import Button from '@/shared/ui/button/Button';

import NotificationList from './NotificationList';

interface NotificationInboxProps {
	initialNotifications: readonly Notification[];
}

export default function NotificationInbox({ initialNotifications }: NotificationInboxProps) {
	const { isAuthenticated, isInitialized } = useAuth();
	const login = useLoginModal();
	const [notifications, setNotifications] = useState(initialNotifications);

	if (!isInitialized) return <NotificationList status="loading" />;

	if (!isAuthenticated) {
		return (
			<div className="flex min-h-80 flex-col items-center justify-center gap-4 px-4 text-center">
				<p className="text-body-3 text-text-secondary">로그인하고 나에게 온 알림을 확인해 보세요.</p>
				<Button onClick={() => login()}>로그인</Button>
			</div>
		);
	}

	return (
		<>
			<NotificationList
				status="success"
				notifications={notifications}
				onRead={(id) =>
					setNotifications((current) =>
						current.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)),
					)
				}
				onReadAll={() =>
					setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })))
				}
			/>
		</>
	);
}
