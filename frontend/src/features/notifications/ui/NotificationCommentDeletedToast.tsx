'use client';

import { useEffect, useState } from 'react';

export default function NotificationCommentDeletedToast() {
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		const timeout = window.setTimeout(() => setIsVisible(false), 5000);
		return () => window.clearTimeout(timeout);
	}, []);

	if (!isVisible) return null;

	return (
		<div
			role="status"
			className="fixed right-5 bottom-5 z-50 rounded-lg border border-border-default bg-surface px-4 py-3 text-body-4 text-text-primary shadow-modal"
		>
			해당 댓글이 삭제되었어요.
		</div>
	);
}
