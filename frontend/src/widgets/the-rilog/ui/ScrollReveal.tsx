'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ScrollRevealProps {
	children: ReactNode;
	className: string;
}

export default function ScrollReveal({ children, className }: ScrollRevealProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (
			container === null ||
			window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
			!('IntersectionObserver' in window)
		) {
			return;
		}
		const bounds = container.getBoundingClientRect();
		if (bounds.top < window.innerHeight && bounds.bottom > 0) {
			container.dataset.reveal = 'visible';
			return;
		}
		container.dataset.reveal = 'pending';

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					container.dataset.reveal = 'visible';
					observer.disconnect();
				}
			},
			{ rootMargin: '0px 0px -24px 0px', threshold: 0.12 },
		);

		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={containerRef} className={className}>
			{children}
		</div>
	);
}
