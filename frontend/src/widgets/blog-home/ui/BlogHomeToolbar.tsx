'use client';

import { useState } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';

import BlogHomeNavigation from './BlogHomeNavigation';
import styles from './BlogHomeToolbar.module.css';

interface BlogHomeToolbarProps {
	blogType: BlogType;
}

const CATEGORIES = ['전체', 'IT', '일상'] as const;

export default function BlogHomeToolbar({ blogType }: BlogHomeToolbarProps) {
	const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>('전체');
	const [isNavigationExpanded, setIsNavigationExpanded] = useState(false);
	const navigationPanelId = `blog-home-${blogType.toLowerCase()}-mobile-navigation`;

	return (
		<div className="mb-8">
			<div className="flex items-end border-b border-border-default">
				<div aria-label="글 카테고리" className="flex items-center gap-6">
					{CATEGORIES.map((category) => {
						const isSelected = selectedCategory === category;
						return (
							<button
								key={category}
								type="button"
								aria-pressed={isSelected}
								className={`relative min-h-11 px-1 pb-3 text-body-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transition-none ${
									isSelected
										? 'font-semibold text-text-primary after:absolute after:right-0 after:bottom-[-1px] after:left-0 after:h-0.5 after:bg-brand-primary'
										: 'text-text-secondary hover:text-text-primary'
								}`}
								onClick={() => setSelectedCategory(category)}
							>
								{category}
							</button>
						);
					})}
				</div>
			</div>

			<div className={styles.mobileNavTrigger}>
				<button
					type="button"
					aria-label={`글 탐색 ${isNavigationExpanded ? '접기' : '펼치기'}`}
					aria-controls={navigationPanelId}
					aria-expanded={isNavigationExpanded}
					className="flex min-h-11 w-full items-center gap-3 border-b border-border-default text-left transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:text-text-primary motion-reduce:transition-none"
					onClick={() => setIsNavigationExpanded((isExpanded) => !isExpanded)}
				>
					<span className="text-body-1 font-semibold text-text-primary">글 탐색</span>
					<span
						aria-hidden="true"
						className={`ml-auto text-title-1 text-navy-600 transition-transform duration-200 motion-reduce:transition-none ${isNavigationExpanded ? 'rotate-90' : ''}`}
					>
						›
					</span>
				</button>

				{isNavigationExpanded && (
					<div id={navigationPanelId} className="border-b border-border-default pb-6">
						<BlogHomeNavigation blogType={blogType} />
					</div>
				)}
			</div>
		</div>
	);
}
