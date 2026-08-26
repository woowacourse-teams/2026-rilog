'use client';

import { useEffect, useState } from 'react';

import type { MouseEvent } from 'react';

import type { PostTableOfContentsItem } from '@/features/post-detail/lib/extract-post-table-of-contents';

interface PostTableOfContentsProps {
	items: PostTableOfContentsItem[];
}

const INDENT_CLASS_BY_LEVEL: Record<PostTableOfContentsItem['level'], string | undefined> = {
	1: undefined,
	2: 'pl-3',
	3: 'pl-6',
};

// 목차 ui 구현
export default function PostTableOfContents({ items }: PostTableOfContentsProps) {
	const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

	useEffect(() => {
		if (typeof IntersectionObserver === 'undefined') {
			return;
		}

		//헤딩 추출
		const headings = items
			.map(({ id }) => document.getElementById(id))
			.filter((heading): heading is HTMLElement => heading !== null);

		// 옵저버
		const observer = new IntersectionObserver(
			(entries) => {
				const firstVisibleHeading = entries
					.filter((entry) => entry.isIntersecting)
					.toSorted((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

				if (firstVisibleHeading?.target instanceof HTMLElement) {
					setActiveId(firstVisibleHeading.target.id);
				}
			},
			{ rootMargin: '-15% 0px -70%', threshold: 0 },
		);

		headings.forEach((heading) => observer.observe(heading));

		return () => observer.disconnect();
	}, [items]);

	//url에 앵커 추가
	const handleAnchorClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
		event.preventDefault();
		const heading = document.getElementById(id);

		if (heading === null) {
			return;
		}

		const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		heading.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth', block: 'start' });
		window.history.replaceState(window.history.state, '', `#${encodeURIComponent(id)}`);
		setActiveId(id);
	};

	return (
		<aside className="absolute inset-y-0 left-full ml-16 hidden w-48 aside-both:block">
			<nav aria-label="게시글 목차" className="sticky top-10 border-l border-border-default pl-5">
				<ol className="space-y-2.5">
					{items.map((item) => {
						const isActive = item.id === activeId;

						return (
							<li key={item.id} className={INDENT_CLASS_BY_LEVEL[item.level]}>
								<a
									href={`#${item.id}`}
									aria-current={isActive ? 'location' : undefined}
									className={`block rounded-sm text-label-2 transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${isActive ? 'font-semibold text-brand-primary' : 'text-text-placeholder'}`}
									onClick={(event) => handleAnchorClick(event, item.id)}
								>
									{item.text}
								</a>
							</li>
						);
					})}
				</ol>
			</nav>
		</aside>
	);
}
