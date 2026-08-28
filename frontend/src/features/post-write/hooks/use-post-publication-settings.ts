'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { CologOption } from '@/domains/blog/model/colog';
import type { PostCategory } from '@/domains/post/model/post';
import type { PublicationSettings } from '@/features/post-write/model/post-publication';

interface UsePostPublicationSettingsOptions {
	initialSettings?: PublicationSettings;
}

const DEFAULT_PUBLICATION_SETTINGS: PublicationSettings = {
	category: 'IT',
	blog: null,
	representativeImage: null,
	representativeImageUrl: null,
};

export function usePostPublicationSettings({ initialSettings }: UsePostPublicationSettingsOptions = {}) {
	const selectedImageUrlRef = useRef<string | null>(null);
	const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
	const [settings, setSettings] = useState(initialSettings ?? DEFAULT_PUBLICATION_SETTINGS);
	const [cologError, setCologError] = useState<string>();

	const revokeSelectedImageUrl = useCallback(() => {
		if (selectedImageUrlRef.current === null) {
			return;
		}

		URL.revokeObjectURL(selectedImageUrlRef.current);
		selectedImageUrlRef.current = null;
	}, []);

	useEffect(() => revokeSelectedImageUrl, [revokeSelectedImageUrl]);

	const handleImageChange = useCallback(
		(file: File | null) => {
			revokeSelectedImageUrl();

			const nextImageUrl = file === null ? null : URL.createObjectURL(file);
			selectedImageUrlRef.current = nextImageUrl;
			setSelectedImageUrl(nextImageUrl);
			setSettings((currentSettings) => ({
				...currentSettings,
				representativeImage: file,
				representativeImageUrl: null,
			}));
		},
		[revokeSelectedImageUrl],
	);

	const handleCategoryChange = useCallback((category: PostCategory) => {
		setSettings((currentSettings) => ({ ...currentSettings, category }));
	}, []);

	const handleCoLogChange = useCallback((blog: CologOption | null) => {
		setSettings((currentSettings) => ({ ...currentSettings, blog }));
		setCologError(undefined);
	}, []);

	const validatePublicationSettings = useCallback(() => {
		if (settings.blog === null) {
			setCologError('Co-log를 선택해 주세요.');
			return false;
		}

		setCologError(undefined);
		return true;
	}, [settings.blog]);

	const clearSelectedImageUrl = useCallback(() => {
		revokeSelectedImageUrl();
		setSelectedImageUrl(null);
	}, [revokeSelectedImageUrl]);

	return {
		settings,
		representativeImagePreviewUrl: selectedImageUrl ?? settings.representativeImageUrl,
		cologError,
		handleImageChange,
		handleCategoryChange,
		handleCoLogChange,
		validatePublicationSettings,
		clearSelectedImageUrl,
	};
}
