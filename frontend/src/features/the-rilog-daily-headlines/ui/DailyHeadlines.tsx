'use client';

import { useRef, useState } from 'react';

import type { DailyHeadline } from '../model/daily-headline';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

import styles from './daily-headlines.module.css';
import DailyHeadlineIndicator from './DailyHeadlineIndicator';

interface DailyHeadlinesProps {
	dailyHeadlines: readonly DailyHeadline[];
}

export default function DailyHeadlines({ dailyHeadlines }: DailyHeadlinesProps) {
	const listRef = useRef<HTMLOListElement>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const currentIndex = dailyHeadlines.length === 0 ? 0 : activeIndex % dailyHeadlines.length;

	if (dailyHeadlines.length === 0) return null;

	return (
		<section className={styles.headlines} aria-labelledby="the-rilog-daily-headlines-heading">
			<header className={styles.header}>
				<h2 id="the-rilog-daily-headlines-heading">Daily Headlines</h2>
				<p className={styles.publication}>updates daily at 06:00</p>
			</header>
			<div className={styles.listContainer}>
				<ol ref={listRef} className={styles.list}>
					{dailyHeadlines.map((headline, index) => (
						<li
							key={headline.id}
							className={styles.item}
							data-active={index === currentIndex}
							onMouseEnter={() => setActiveIndex(index)}
							onFocusCapture={() => setActiveIndex(index)}
						>
							<CustomLink
								href={`${APP_ROUTES.theRilog}/daily-headlines#${encodeURIComponent(headline.id)}`}
								className={styles.itemLink}
								title={headline.title}
								aria-current={index === currentIndex ? 'true' : undefined}
							>
								<span className={styles.number} aria-hidden="true">
									{String(index + 1).padStart(2, '0')}
								</span>
								<span className={styles.titleText}>{headline.title}</span>
							</CustomLink>
						</li>
					))}
				</ol>
				<DailyHeadlineIndicator activeIndex={currentIndex} listRef={listRef} />
			</div>
		</section>
	);
}
