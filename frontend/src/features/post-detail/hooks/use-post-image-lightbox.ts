'use client';

import { useState } from 'react';

import type { MouseEvent } from 'react';

export interface PostLightboxImage {
	src: string;
	alt: string;
}

export const usePostImageLightbox = () => {
	const [images, setImages] = useState<readonly PostLightboxImage[]>([]);
	const [currentIndex, setCurrentIndex] = useState<number | null>(null);

	const handleImageClick = (event: MouseEvent<HTMLElement>): boolean => {
		if (!(event.target instanceof HTMLImageElement) || event.target.closest('a') !== null) {
			return false;
		}

		const clickedImage = event.target;
		const postImages = Array.from(event.currentTarget.querySelectorAll<HTMLImageElement>('img')).filter(
			(image) => image.closest('a') === null && (image.currentSrc || image.src) !== '',
		);
		const nextIndex = postImages.indexOf(clickedImage);
		if (nextIndex < 0) {
			return false;
		}

		setImages(postImages.map((image) => ({ src: image.currentSrc || image.src, alt: image.alt })));
		setCurrentIndex(nextIndex);
		return true;
	};

	const handleClose = () => {
		setCurrentIndex(null);
	};

	const handleChangeIndex = (nextIndex: number) => {
		setCurrentIndex((prevIndex) => {
			if (prevIndex === null || nextIndex < 0 || nextIndex >= images.length) {
				return prevIndex;
			}

			return nextIndex;
		});
	};

	return {
		open: currentIndex !== null,
		images,
		currentIndex: currentIndex ?? 0,
		handleImageClick,
		handleClose,
		handleChangeIndex,
	};
};
