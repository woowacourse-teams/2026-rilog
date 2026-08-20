'use client';

import Image from 'next/image';
import { useState } from 'react';

import { getImageUrl } from '@/shared/utils/get-image-url';

interface PostDetailHeroProps {
	title: string;
	thumbnailImageUrl: string | null;
}

export default function PostDetailHero({ title, thumbnailImageUrl }: PostDetailHeroProps) {
	const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
	const imageUrl = getImageUrl(thumbnailImageUrl);
	const hasFallback = imageUrl === '' || failedImageUrl === imageUrl;

	return (
		<figure
			aria-label={`${title} 대표 이미지`}
			className="relative m-0 h-[clamp(20rem,min(50vw,calc(100svh-12rem)),48rem)] overflow-hidden bg-brand-primary"
		>
			{hasFallback ? null : (
				<Image
					src={imageUrl}
					alt={title}
					fill
					priority
					sizes="(max-width: 768px) 100vw, calc(100vw - 4.375rem)"
					className="object-cover"
					onError={() => setFailedImageUrl(imageUrl)}
				/>
			)}
		</figure>
	);
}
