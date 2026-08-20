'use client';

import Image from 'next/image';
import { useState } from 'react';

import { POST_THUMBNAIL_FALLBACK_URL, resolvePostThumbnailUrl } from '@/domains/post/lib/post-thumbnail';

interface PostDetailHeroProps {
	title: string;
	thumbnailUrl: string | null;
}

export default function PostDetailHero({ title, thumbnailUrl }: PostDetailHeroProps) {
	const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
	const resolvedThumbnailUrl = resolvePostThumbnailUrl(thumbnailUrl);
	const hasFallback = failedImageUrl === resolvedThumbnailUrl;
	const imageUrl = hasFallback ? POST_THUMBNAIL_FALLBACK_URL : resolvedThumbnailUrl;

	return (
		<figure
			aria-label={`${title} 대표 이미지`}
			className="relative m-0 h-[clamp(20rem,min(50vw,calc(100svh-12rem)),48rem)] overflow-hidden bg-brand-primary"
		>
			<Image
				src={imageUrl}
				alt={title}
				fill
				priority
				sizes="(max-width: 768px) 100vw, calc(100vw - 4.375rem)"
				className="object-cover"
				onError={() => {
					if (!hasFallback) {
						setFailedImageUrl(resolvedThumbnailUrl);
					}
				}}
			/>
		</figure>
	);
}
