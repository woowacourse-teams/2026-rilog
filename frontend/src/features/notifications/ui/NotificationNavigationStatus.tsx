'use client';

import { useLinkStatus } from 'next/link';

export default function NotificationNavigationStatus() {
	const { pending } = useLinkStatus();

	return (
		<>
			<span aria-hidden="true" className="pointer-events-none absolute inset-0 z-1 flex items-center justify-center">
				<span
					className={`rounded-full border border-border-default bg-surface px-3 py-1 text-label-2 text-text-primary shadow-sm transition-opacity duration-150 motion-reduce:transition-none ${pending ? 'opacity-100 delay-150' : 'opacity-0'}`}
				>
					게시글로 이동 중...
				</span>
			</span>
			<span role="status" className="sr-only">
				{pending ? '게시글로 이동 중' : ''}
			</span>
		</>
	);
}
