'use client';

import { useEffect } from 'react';

const REVEAL_SELECTOR = '[data-about-reveal]';

export default function AboutViewportReveal() {
	useEffect(() => {
		const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
		const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (shouldReduceMotion) {
			for (const element of elements) {
				element.dataset.aboutRevealVisible = 'true';
			}

			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) {
						continue;
					}

					const element = entry.target as HTMLElement;
					element.dataset.aboutRevealVisible = 'true';
					observer.unobserve(element);
				}
			},
			{
				rootMargin: '0px 0px -8% 0px',
				threshold: 0.12,
			},
		);

		for (const element of elements) {
			observer.observe(element);
		}

		return () => observer.disconnect();
	}, []);

	return null;
}
