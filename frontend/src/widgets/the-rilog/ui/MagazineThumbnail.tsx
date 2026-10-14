'use client';

import Image from 'next/image';
import { useState } from 'react';

import { getImageUrl } from '@/shared/utils/get-image-url';

import styles from './the-rilog-magazine.module.css';

interface MagazineThumbnailProps {
	src: string | null;
}

export default function MagazineThumbnail({ src }: MagazineThumbnailProps) {
	const [isFailed, setIsFailed] = useState(false);
	const imageUrl = getImageUrl(src);
	return (
		<div className={styles.artworkFrame} data-thumbnail-ratio="16:10" aria-hidden="true">
			{imageUrl && !isFailed ? (
				<Image
					className={styles.artwork}
					src={imageUrl}
					alt=""
					fill
					sizes="(max-width: 48rem) 112px, (max-width: 70rem) 50vw, 33vw"
					onError={() => setIsFailed(true)}
				/>
			) : (
				<div className={styles.artwork} />
			)}
		</div>
	);
}
