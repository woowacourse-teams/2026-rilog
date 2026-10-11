'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { Notification } from '@/domains/notification/model/notification';

export const useNotificationExposure = (notification: Notification, onExpose: (notification: Notification) => void) => {
	const itemRef = useRef<HTMLLIElement>(null);
	const hasExposedRef = useRef(false);
	const handleExpose = useCallback(() => {
		if (hasExposedRef.current) return;
		hasExposedRef.current = true;
		onExpose(notification);
	}, [notification, onExpose]);

	useEffect(() => {
		const item = itemRef.current;
		if (item === null || hasExposedRef.current || typeof IntersectionObserver === 'undefined') return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					handleExpose();
					observer.disconnect();
				}
			},
			{ threshold: 0.5 },
		);
		observer.observe(item);
		return () => observer.disconnect();
	}, [handleExpose]);

	return { itemRef, handleExpose };
};
