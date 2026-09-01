'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import type { PostCategory } from '@/domains/post/model/post';
import type { PublicationSettings, TargetBlog } from '@/features/post-write/model/post-publication';

interface UsePostPublicationSettingsOptions {
	initialSettings?: PublicationSettings;
	userSlug?: string | null;
}

const DEFAULT_PUBLICATION_SETTINGS: PublicationSettings = {
	category: 'IT',
	blog: null,
	chapterId: null,
	representativeImage: null,
	representativeImageUrl: null,
};

export function usePostPublicationSettings({ initialSettings, userSlug }: UsePostPublicationSettingsOptions = {}) {
	const selectedImageUrlRef = useRef<string | null>(null);
	const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
	const [settings, setSettings] = useState(initialSettings ?? DEFAULT_PUBLICATION_SETTINGS);
	const [cologError, setCologError] = useState<string>();
	const [hasUserChangedTargetBlog, setHasUserChangedTargetBlog] = useState(false);
	const resolvedSettings: PublicationSettings =
		settings.blog === null && !hasUserChangedTargetBlog && userSlug !== null && userSlug !== undefined
			? { ...settings, blog: { type: 'RILOG', slug: userSlug } }
			: settings;

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

	const handleTargetBlogChange = useCallback((targetBlog: TargetBlog | null) => {
		setHasUserChangedTargetBlog(true);
		setSettings((currentSettings) => ({ ...currentSettings, blog: targetBlog, chapterId: null }));
		setCologError(undefined);
	}, []);

	const handleChapterChange = useCallback((chapterId: number | null) => {
		setSettings((currentSettings) => ({ ...currentSettings, chapterId }));
	}, []);

	const validatePublicationSettings = useCallback(
		(selectedBlog: BlogType) => {
			if (selectedBlog === 'COLOG' && resolvedSettings.blog?.type !== 'COLOG') {
				setCologError('코로그를 선택해 주세요.');
				return false;
			}

			setCologError(undefined);
			return true;
		},
		[resolvedSettings.blog],
	);

	const clearSelectedImageUrl = useCallback(() => {
		revokeSelectedImageUrl();
		setSelectedImageUrl(null);
	}, [revokeSelectedImageUrl]);

	return {
		settings: resolvedSettings,
		representativeImagePreviewUrl: selectedImageUrl ?? resolvedSettings.representativeImageUrl,
		cologError,
		handleImageChange,
		handleCategoryChange,
		handleTargetBlogChange,
		handleChapterChange,
		validatePublicationSettings,
		clearSelectedImageUrl,
	};
}
