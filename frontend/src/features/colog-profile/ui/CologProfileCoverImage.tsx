'use client';

import Image from 'next/image';
import { useState } from 'react';

interface CologProfileCoverImageProps {
	src: string;
	alt: string;
}

export default function CologProfileCoverImage({ src, alt }: CologProfileCoverImageProps) {
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
