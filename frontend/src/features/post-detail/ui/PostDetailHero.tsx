'use client';

import { useState } from 'react';

import { POST_THUMBNAIL_FALLBACK_URL, resolvePostThumbnailUrl } from '@/domains/post/lib/post-thumbnail';

interface PostDetailHeroProps {
	title: string;
	thumbnailUrl: string | null;
}

export default function PostDetailHero({ title, thumbnailUrl }: PostDetailHeroProps) {
	const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
	const resolvedThumbnailUrl = resolvePostThumbnailUrl(thumbnailUrl);
	const isFallback = resolvedThumbnailUrl === POST_THUMBNAIL_FALLBACK_URL || failedImageUrl === resolvedThumbnailUrl;

	if (isFallback) return null;

	return (
		<figure
			aria-label={`${title} 대표 이미지`}
			className="[container-type:inline-size] relative m-0 w-full overflow-hidden bg-thumbnail-background"
		>
			{/* 원본 비율을 유지하되 높이가 너비의 75%를 넘을 때만 중앙을 기준으로 자른다. */}
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={resolvedThumbnailUrl}
				alt={title}
				loading="eager"
				fetchPriority="high"
				className="block h-auto max-h-[75cqw] w-full object-cover object-center"
				onError={() => {
					setFailedImageUrl(resolvedThumbnailUrl);
				}}
			/>
		</figure>
	);
}
