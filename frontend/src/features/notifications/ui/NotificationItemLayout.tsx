'use client';

import { useId, useRef } from 'react';

import type { ReactNode } from 'react';

import Button from '@/shared/ui/button/Button';

interface NotificationItemLayoutProps {
	isRead: boolean;
	accessibleLabel: string;
	content: ReactNode;
	onRead: () => void;
}

export default function NotificationItemLayout({
	isRead,
	accessibleLabel,
	content,
	onRead,
}: NotificationItemLayoutProps) {
	const readStatusId = useId();
	const articleRef = useRef<HTMLElement>(null);
	const handleRead = () => {
		// 버튼이 사라져도 현재 행에서 키보드 탐색을 이어가고 스크롤 위치를 유지한다.
		articleRef.current?.focus({ preventScroll: true });
		onRead();
	};
	return (
		<article
			ref={articleRef}
			tabIndex={-1}
			aria-label={accessibleLabel}
			aria-describedby={readStatusId}
			className={`relative isolate px-6 py-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring ${
				isRead ? 'bg-transparent text-text-secondary' : 'bg-focus-ring/5 text-text-primary'
			}`}
		>
			<span id={readStatusId} className="sr-only">
				{isRead ? '읽은 알림' : '읽지 않은 알림'}
			</span>
			{!isRead && <span aria-hidden="true" className="absolute top-8 right-6 size-1.5 rounded-full bg-danger" />}
			{content}
			{!isRead && (
				<div className="mt-3 flex h-8 justify-end">
					<Button size="sm" variant="ghost" className="relative z-10" onClick={handleRead}>
						읽음으로 표시
					</Button>
				</div>
			)}
		</article>
	);
}
