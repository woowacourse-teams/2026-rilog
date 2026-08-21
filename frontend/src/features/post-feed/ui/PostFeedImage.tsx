'use client';

import Image from 'next/image';
import { useState } from 'react';

import { getImageUrl } from '@/shared/utils/get-image-url';

interface PostFeedImageProps {
	src: string | null;
	fallbackSrc?: string;
	alt: string;
	width: number;
	height: number;
	className?: string;
	fallbackClassName?: string;
	isScaledOnInteraction?: boolean;
}

const DEFAULT_FALLBACK_IMAGE_URL = '/brand/logo.svg';

export default function PostFeedImage({
	src,
	fallbackSrc = DEFAULT_FALLBACK_IMAGE_URL,
	alt,
	width,
	height,
	className = '',
	fallbackClassName = '',
	isScaledOnInteraction = false,
}: PostFeedImageProps) {
	const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
	const sourceImageUrl = getImageUrl(src);
	const hasFallback = sourceImageUrl === '' || sourceImageUrl === failedImageUrl;
	const imageUrl = hasFallback ? getImageUrl(fallbackSrc) : sourceImageUrl;

	return (
		<Image
			src={imageUrl}
			alt={alt}
			width={width}
			height={height}
			loading="lazy"
			className={`${className} ${hasFallback ? fallbackClassName : ''} ${
				isScaledOnInteraction
					? 'transition-transform duration-200 ease-out group-hover:scale-[1.05] group-focus-visible:scale-[1.05] group-active:scale-[1.05] motion-reduce:transform-none motion-reduce:transition-none'
					: ''
			}`.trim()}
			onError={() => {
				if (!hasFallback) {
					setFailedImageUrl(sourceImageUrl);
				}
			}}
		/>
	);
}
