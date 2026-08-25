'use client';

import Image from 'next/image';
import { useState } from 'react';

interface BlogProfileCoverImageProps {
	src: string;
	alt: string;
}

export default function BlogProfileCoverImage({ src, alt }: BlogProfileCoverImageProps) {
	const [hasFailed, setHasFailed] = useState(false);

	if (hasFailed) {
		return null;
	}

	return (
		<Image
			src={src}
			alt={alt}
			fill
			priority
			sizes="100vw"
			className="object-cover"
			onError={() => setHasFailed(true)}
		/>
	);
}
