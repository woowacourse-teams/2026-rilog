'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import { POST_CATEGORY_OPTIONS } from '@/domains/post/model/post';
import { buildFeedFilterHref, parseFeedFilters } from '@/features/post-feed/lib/feed-filter';
import { navigateFeedFilter } from '@/features/post-feed/lib/navigate-feed-filter';

const CATEGORIES = [{ label: '전체', value: undefined }, ...POST_CATEGORY_OPTIONS] as const;
const SCROLL_UP_REVEAL_THRESHOLD_PX = 24;

const TITLE_BY_BLOG_TYPE: Record<BlogType | 'ALL', string> = {
	ALL: 'All',
	RILOG: 'Personal',
	COLOG: 'Colog',
};

interface PostFeedHeaderProps {
	id: string;
}

export default function PostFeedHeader({ id }: PostFeedHeaderProps) {
	const searchParams = useSearchParams();
	const filters = parseFeedFilters(searchParams);
	const headerRef = useRef<HTMLElement>(null);
	const previousScrollYRef = useRef(0);
	const upwardScrollDistanceRef = useRef(0);
	const hasUserInteractedRef = useRef(false);
	const [isHidden, setIsHidden] = useState(false);
	const title = TITLE_BY_BLOG_TYPE[filters.blogType ?? 'ALL'];

	useEffect(() => {
		previousScrollYRef.current = window.scrollY;

		const markUserInteracted = () => {
			hasUserInteractedRef.current = true;
		};
		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			const previousScrollY = previousScrollYRef.current;
			previousScrollYRef.current = currentScrollY;

			if (currentScrollY <= 0 || !hasUserInteractedRef.current) {
				upwardScrollDistanceRef.current = 0;
				setIsHidden(false);
				return;
			}

			if (currentScrollY < previousScrollY) {
				upwardScrollDistanceRef.current += previousScrollY - currentScrollY;
				if (upwardScrollDistanceRef.current >= SCROLL_UP_REVEAL_THRESHOLD_PX) {
					upwardScrollDistanceRef.current = 0;
					setIsHidden(false);
				}
				return;
			}
			if (currentScrollY > previousScrollY) {
				upwardScrollDistanceRef.current = 0;
			}

			const header = headerRef.current;
			if (header === null || currentScrollY === previousScrollY) {
				return;
			}

			const stickyTop = Number.parseFloat(window.getComputedStyle(header).top) || 0;
			if (header.getBoundingClientRect().top <= stickyTop + 1) {
				setIsHidden(true);
			}
		};

		window.addEventListener('pointerdown', markUserInteracted, { passive: true });
		window.addEventListener('touchstart', markUserInteracted, { passive: true });
		window.addEventListener('wheel', markUserInteracted, { passive: true });
		window.addEventListener('keydown', markUserInteracted);
		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => {
			window.removeEventListener('pointerdown', markUserInteracted);
			window.removeEventListener('touchstart', markUserInteracted);
			window.removeEventListener('wheel', markUserInteracted);
			window.removeEventListener('keydown', markUserInteracted);
			window.removeEventListener('scroll', handleScroll);
		};
	}, []);

	return (
		<header
			ref={headerRef}
			id={id}
			aria-labelledby={`${id}-title`}
			className={`sticky top-16 z-30 mb-6 w-full scroll-mt-20 bg-background transition-transform duration-200 ease-out motion-reduce:transition-none sm:top-0 sm:scroll-mt-8 ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}
		>
			<div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-6 pt-5 pb-3 sm:pt-6 sm:pb-4 md:px-16">
				<h2 id={`${id}-title`} className="shrink-0 text-title-1 font-semibold text-logo-primary">
					<span>{title}</span>
					<span className="text-logo-secondary">.</span>
				</h2>

				<ul
					aria-label="게시글 카테고리"
					className="flex min-w-0 shrink justify-end gap-1.5 text-body-1 whitespace-nowrap sm:gap-4"
				>
					{CATEGORIES.map(({ label, value }) => {
						const href = buildFeedFilterHref(searchParams, { category: value });
						const isCurrent = filters.category === value;

						return (
							<li key={label} className="shrink-0">
								<Link
									href={href}
									scroll={false}
									onNavigate={(event) => {
										event.preventDefault();
										navigateFeedFilter(href);
									}}
									aria-current={isCurrent ? 'page' : undefined}
									className={`${isCurrent ? 'font-semibold text-text-primary' : 'text-text-secondary hover:text-focus-ring'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring`}
								>
									{label}
								</Link>
							</li>
						);
					})}
				</ul>
			</div>
			<div className="mx-auto w-full max-w-7xl px-6 md:px-16" aria-hidden="true">
				<div className="border-b border-border-strong" />
			</div>
		</header>
	);
}
