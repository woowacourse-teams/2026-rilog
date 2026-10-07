'use client';

import { useEffect, useState } from 'react';

import type { MouseEvent } from 'react';

import type { PostTableOfContentsItem } from '@/features/post-detail/lib/extract-post-table-of-contents';

interface PostTableOfContentsProps {
	items: PostTableOfContentsItem[];
}

const INDENT_CLASS_BY_LEVEL: Record<PostTableOfContentsItem['level'], string | undefined> = {
	1: undefined,
	2: 'pl-1.5',
	3: 'pl-3',
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
			{ rootMargin: '0px 0px -94%', threshold: 0 },
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
		<nav aria-label="게시글 목차">
			<ol className="max-h-[var(--post-toc-max-height)] [scrollbar-gutter:stable] space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain border-l border-border-default pr-1 pl-2.5">
				{items.map((item) => {
					const isActive = item.id === activeId;

					return (
						<li key={item.id}>
							<a
								href={`#${encodeURIComponent(item.id)}`}
								aria-current={isActive ? 'location' : undefined}
								className={`block rounded-sm text-label-1 leading-[1.125rem] transition-colors hover:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${INDENT_CLASS_BY_LEVEL[item.level]} ${isActive ? 'font-semibold text-brand-primary' : 'font-medium text-text-placeholder'}`}
								onClick={(event) => handleAnchorClick(event, item.id)}
							>
								{item.text}
							</a>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
