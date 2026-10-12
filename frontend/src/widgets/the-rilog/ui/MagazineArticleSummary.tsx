'use client';

import { useLayoutEffect, useRef } from 'react';

import styles from './the-rilog-magazine.module.css';

interface MagazineArticleSummaryProps {
	text: string;
	fitToThumbnail: boolean;
}

export default function MagazineArticleSummary({ text, fitToThumbnail }: MagazineArticleSummaryProps) {
	const summaryRef = useRef<HTMLParagraphElement>(null);

	useLayoutEffect(() => {
		const summary = summaryRef.current;
		const body = summary?.parentElement;
		const card = summary?.closest('article');
		const image = card?.querySelector('[data-thumbnail-ratio]');
		const heading = card?.querySelector('h3');
		if (!summary || !body || !card || !image || !heading) return;

		const updateLineClamp = () => {
			const summaryStyle = getComputedStyle(summary);
			if (summaryStyle.display === 'none') return;
			if (!fitToThumbnail) {
				summary.style.webkitLineClamp = '';
				summary.style.maxHeight = '';
				summary.style.visibility = '';
				return;
			}
			const imageRect = image.getBoundingClientRect();
			const summaryRect = summary.getBoundingClientRect();
			const lineHeight = Number.parseFloat(summaryStyle.lineHeight);
			if (imageRect.height === 0 || !Number.isFinite(lineHeight) || lineHeight <= 0) return;
			const isSideBySide = summaryRect.left >= imageRect.right - 1;
			const bottomPadding = Number.parseFloat(getComputedStyle(body).paddingBottom);
			const availableHeight = imageRect.bottom - summaryRect.top - bottomPadding;
			const availableLines = Math.max(0, Math.floor(availableHeight / lineHeight));
			const visibleLines = isSideBySide ? availableLines : null;
			const isHidden = visibleLines === 0;
			const maxHeight = isHidden ? '0px' : '';
			const visibility = isHidden ? 'hidden' : '';
			const lineClamp = visibleLines === null || isHidden ? 'unset' : String(visibleLines);
			if (summary.style.maxHeight !== maxHeight) summary.style.maxHeight = maxHeight;
			if (summary.style.visibility !== visibility) summary.style.visibility = visibility;
			if (summary.style.webkitLineClamp !== lineClamp) summary.style.webkitLineClamp = lineClamp;
		};

		updateLineClamp();
		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', updateLineClamp);
			return () => window.removeEventListener('resize', updateLineClamp);
		}
		const observer = new ResizeObserver(updateLineClamp);
		observer.observe(card);
		observer.observe(image);
		observer.observe(heading);
		if (body.firstElementChild) observer.observe(body.firstElementChild);
		return () => observer.disconnect();
	}, [text, fitToThumbnail]);

	return (
		<p ref={summaryRef} className={`${styles.summary}${fitToThumbnail ? ` ${styles.enterpriseSummary}` : ''}`}>
			{text}
		</p>
	);
}
