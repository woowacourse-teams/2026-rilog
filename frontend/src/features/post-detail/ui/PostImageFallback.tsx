'use client';

import { useEffect, useRef } from 'react';

import type { ReactNode } from 'react';

interface PostImageFallbackProps {
	children: ReactNode;
}

const fallbackImage = (image: HTMLImageElement) => {
	if (!image.hasAttribute('srcset')) {
		return;
	}
	image.removeAttribute('srcset');
	image.removeAttribute('sizes');
};

const checkFailedImages = (container: HTMLElement) => {
	const images = container.querySelectorAll<HTMLImageElement>('img');
	images.forEach((image) => {
		if (image.hasAttribute('srcset') && image.complete && image.naturalWidth === 0) {
			fallbackImage(image);
		}
	});
};

export default function PostImageFallback({ children }: PostImageFallbackProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (container === null) {
			return;
		}

		const handleError = (event: Event) => {
			const target = event.target;
			if (target instanceof HTMLImageElement && container.contains(target)) {
				fallbackImage(target);
			}
		};

		container.addEventListener('error', handleError, true);
		checkFailedImages(container);

		return () => {
			container.removeEventListener('error', handleError, true);
		};
	}, []);

	return (
		<div ref={containerRef} className="contents">
			{children}
		</div>
	);
}
