'use client';

import { useEffect, useState } from 'react';

import { getImageUrl } from '@/shared/utils/get-image-url';

export const useImagePreviewUrl = (file: File | null, fallbackUrl: string) => {
	const [objectUrl, setObjectUrl] = useState<string | null>(null);

	useEffect(() => {
		if (file === null) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setObjectUrl(null);
			return;
		}

		const nextObjectUrl = URL.createObjectURL(file);
		setObjectUrl(nextObjectUrl);

		return () => URL.revokeObjectURL(nextObjectUrl);
	}, [file]);

	return objectUrl ?? getImageUrl(fallbackUrl);
};
