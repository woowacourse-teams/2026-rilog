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

const LINE_INDENT_CLASS_BY_LEVEL: Record<PostTableOfContentsItem['level'], string | undefined> = {
	1: undefined,
	2: 'pl-1',
	3: 'pl-2',
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
		<div className="absolute inset-y-0 left-full ml-16 hidden w-48 aside-both:block">
			<nav aria-label="게시글 목차" className="group sticky top-20">
				<ol
					aria-hidden="true"
					className="border-l border-border-default pl-5 transition-opacity group-hover:opacity-0 group-has-[:focus-visible]:opacity-0 motion-reduce:transition-none"
				>
					{items.map((item) => {
						const isActive = item.id === activeId;

						return (
							<li key={item.id}>
								<span
									className={`block leading-4 font-extrabold -tracking-[0.2em] ${LINE_INDENT_CLASS_BY_LEVEL[item.level]} ${isActive ? 'text-text-primary' : 'text-text-placeholder'}`}
								>
									{'-'.repeat(item.text.length)}
								</span>
							</li>
						);
					})}
				</ol>
				<ol className="pointer-events-none absolute inset-x-0 top-0 space-y-2 border-l border-border-default pl-5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-has-[:focus-visible]:pointer-events-auto group-has-[:focus-visible]:opacity-100 motion-reduce:transition-none">
					{items.map((item) => {
						const isActive = item.id === activeId;

						return (
							<li key={item.id}>
								<a
									href={`#${encodeURIComponent(item.id)}`}
									aria-current={isActive ? 'location' : undefined}
									className={`block rounded-sm text-label-2 leading-[1.125rem] transition-colors hover:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${INDENT_CLASS_BY_LEVEL[item.level]} ${isActive ? 'font-semibold text-brand-primary' : 'font-medium text-text-placeholder'}`}
									onClick={(event) => handleAnchorClick(event, item.id)}
								>
									{item.text}
								</a>
							</li>
						);
					})}
				</ol>
			</nav>
		</div>
	);
}
