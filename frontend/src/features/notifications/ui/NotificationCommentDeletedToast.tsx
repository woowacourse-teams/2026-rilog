'use client';

import { useEffect, useState } from 'react';

const TOAST_VISIBLE_DURATION_MS = 3000;
const TOAST_TRANSITION_DURATION_MS = 300;

export default function NotificationCommentDeletedToast() {
	const [isVisible, setIsVisible] = useState(false);
	const [isDismissed, setIsDismissed] = useState(false);

	useEffect(() => {
		let enterFrame: number;
		let dismissTimeout: number;
		const initialFrame = window.requestAnimationFrame(() => {
			enterFrame = window.requestAnimationFrame(() => setIsVisible(true));
		});
		const exitTimeout = window.setTimeout(() => {
			setIsVisible(false);
			dismissTimeout = window.setTimeout(() => setIsDismissed(true), TOAST_TRANSITION_DURATION_MS);
		}, TOAST_VISIBLE_DURATION_MS);

		return () => {
			window.cancelAnimationFrame(initialFrame);
			window.cancelAnimationFrame(enterFrame);
			window.clearTimeout(exitTimeout);
			window.clearTimeout(dismissTimeout);
		};
	}, []);

	if (isDismissed) return null;

	return (
		<div
			role="status"
			className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-white/20 bg-black/80 px-4 py-2 text-body-4 text-white shadow-modal transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none sm:right-5 sm:bottom-6 sm:left-auto sm:translate-x-0 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
		>
			해당 댓글이 삭제되었어요.
		</div>
	);
}
