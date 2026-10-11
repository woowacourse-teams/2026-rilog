'use client';

import { useId, useRef } from 'react';

import type { ReactNode } from 'react';

import Button from '@/shared/ui/button/Button';

import ReadIcon from '../assets/read.svg';

interface NotificationItemLayoutProps {
	isRead: boolean;
	isReadPending: boolean;
	accessibleLabel: string;
	header: ReactNode;
	content: ReactNode;
	onRead: () => void;
}

export default function NotificationItemLayout({
	isRead,
	isReadPending,
	accessibleLabel,
	header,
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
			{!isRead && (
				<span aria-hidden="true" className="absolute top-6 right-6 hidden size-1.5 rounded-full bg-danger sm:block" />
			)}
			<header className="flex items-start justify-between gap-3 sm:gap-5">
				<div className="min-w-0 flex-1">{header}</div>
				{!isRead && (
					<Button
						size="sm"
						variant="ghost"
						className="relative z-10 -mt-0.5 size-6! shrink-0 p-0! hover:bg-focus-ring/10! sm:mr-3 sm:w-auto! sm:gap-1 sm:px-1!"
						aria-label="읽음으로 표시"
						disabled={isReadPending}
						onClick={handleRead}
					>
						<ReadIcon aria-hidden="true" className="size-5" />
						<span className="hidden sm:inline">읽음</span>
					</Button>
				)}
			</header>
			{content}
		</article>
	);
}
