'use client';

import { useEffect, useRef, useState } from 'react';

export function useAllCommentsEntryVisibility(isMobile: boolean) {
	const entryRef = useRef<HTMLDivElement>(null);
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		const entry = entryRef.current;
		if (isMobile || entry === null) return;
		if (typeof IntersectionObserver !== 'undefined') {
			const observer = new IntersectionObserver(([item]) => setIsVisible(item.isIntersecting));
			observer.observe(entry);
			return () => observer.disconnect();
		}
		const update = () => {
			const rect = entry.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) return;
			setIsVisible(rect.bottom > 0 && rect.top < window.innerHeight);
		};
		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	}, [isMobile]);

	return { entryRef, isVisible };
}
