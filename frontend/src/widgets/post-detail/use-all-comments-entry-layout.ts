'use client';

import { useLayoutEffect, useRef, useState } from 'react';

export function useAllCommentsEntryLayout(isMobile: boolean) {
	const entryRef = useRef<HTMLDivElement>(null);
	const [isSticky, setIsSticky] = useState(true);

	useLayoutEffect(() => {
		const entry = entryRef.current;
		if (isMobile || entry === null) return;
		const update = () => {
			const position = getComputedStyle(entry).position;
			setIsSticky(position === 'sticky' || position === '');
		};
		update();
		const container = entry.parentElement?.parentElement;
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
		if (container !== null && container !== undefined) observer?.observe(container);
		window.addEventListener('resize', update);
		return () => {
			observer?.disconnect();
			window.removeEventListener('resize', update);
		};
	}, [isMobile]);

	return { entryRef, isSticky };
}
