'use client';

import { useLayoutEffect, useState } from 'react';

import type { RefObject } from 'react';

import styles from './daily-headlines.module.css';

interface DailyHeadlineIndicatorProps {
	activeIndex: number;
	listRef: RefObject<HTMLOListElement | null>;
}

interface IndicatorPosition {
	x: number;
	y: number;
	height: number;
}

export default function DailyHeadlineIndicator({ activeIndex, listRef }: DailyHeadlineIndicatorProps) {
	const [position, setPosition] = useState<IndicatorPosition | null>(null);

	useLayoutEffect(() => {
		const list = listRef.current;
		const item = list?.children.item(activeIndex);
		const link = item?.firstElementChild;
		if (!list || !link) return;

		const updatePosition = () => {
			const listRect = list.getBoundingClientRect();
			const linkRect = link.getBoundingClientRect();
			setPosition({
				x: linkRect.left - listRect.left,
				y: linkRect.top - listRect.top + linkRect.height * 0.17,
				height: linkRect.height * 0.66,
			});
		};

		updatePosition();
		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', updatePosition);
			return () => window.removeEventListener('resize', updatePosition);
		}
		const observer = new ResizeObserver(updatePosition);
		observer.observe(list);
		observer.observe(link);
		return () => observer.disconnect();
	}, [activeIndex, listRef]);

	if (position === null) return null;

	return (
		<span
			aria-hidden="true"
			className={styles.indicator}
			style={{ height: position.height, transform: `translate(${position.x}px, ${position.y}px)` }}
		/>
	);
}
