'use client';

import { useState } from 'react';

import ResponsiveImage from '@/shared/ui/responsive-image/ResponsiveImage';
import { getImageUrl } from '@/shared/utils/get-image-url';
import { parseImageSizeHash } from '@/shared/utils/image-size-hash';

interface PostFeedImageProps {
	src: string | null;
	fallbackSrc?: string;
	alt: string;
	width?: number;
	height?: number;
	sizes?: string;
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
	sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
	className = '',
	fallbackClassName = '',
	isScaledOnInteraction = false,
}: PostFeedImageProps) {
	const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
	const sourceImageUrl = getImageUrl(parseImageSizeHash(src ?? '')?.url ?? src);
	const hasFallback = sourceImageUrl === '' || sourceImageUrl === failedImageUrl;
	const imageUrl = hasFallback ? getImageUrl(fallbackSrc) : sourceImageUrl;

	return (
		<ResponsiveImage
			src={imageUrl}
			alt={alt}
			width={width}
			height={height}
			sizes={sizes}
			loading="lazy"
			className={`${className} ${hasFallback ? fallbackClassName : ''} ${
				isScaledOnInteraction
					? 'transition-transform duration-200 ease-out group-focus-within/card:scale-[1.05] group-hover/card:scale-[1.05] group-active/card:scale-[1.05] motion-reduce:transform-none motion-reduce:transition-none'
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
