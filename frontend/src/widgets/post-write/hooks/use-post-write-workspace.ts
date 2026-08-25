'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Block } from '@blocknote/core';

import type { CologOption } from '@/domains/blog/model/colog';
import type { PostCategory } from '@/domains/post/model/post';
import { analytics } from '@/features/analytics/model/events';
import { usePostDocument } from '@/features/post-write/hooks/use-post-document';
import type { EditorDocument, PublicationSettings, PublishPost } from '@/features/post-write/model/post-publication';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { buildPostDetailPath } from '@/shared/routes/app-routes';

type PublishState = { status: 'idle' } | { status: 'pending' } | { status: 'error'; message: string };

interface UsePostWriteWorkspaceOptions {
	initialDocument?: EditorDocument;
	initialPublicationSettings?: PublicationSettings;
	publishPost: PublishPost;
	navigate?: (href: string) => void;
}

const INITIAL_PUBLICATION_SETTINGS: PublicationSettings = {
	category: 'IT',
	blog: null,
	representativeImage: null,
	representativeImageUrl: null,
};

export function usePostWriteWorkspace({
	initialDocument,
	initialPublicationSettings,
	publishPost,
	navigate,
}: UsePostWriteWorkspaceOptions) {
	const router = useRouter();

	const selectedImageUrlRef = useRef<string | null>(null);

	const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
	const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
	const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

	const [publicationBlocks, setPublicationBlocks] = useState<Block[]>([]);
	const [publishState, setPublishState] = useState<PublishState>({ status: 'idle' });
	const [publicationSettings, setPublicationSettings] = useState(
		initialPublicationSettings ?? INITIAL_PUBLICATION_SETTINGS,
	);

	const [cologError, setCologError] = useState<string>();
	const {
		titleRef,
		editorRef,
		title,
		isEditorReady,
		isDirty,
		documentErrors,
		handleTitleChange,
		handleEditorReady,
		handleEditorChange,
		preparePostDocument,
		markClean,
	} = usePostDocument({ initialDocument });

	const isPublishing = publishState.status === 'pending';
	const publishError = publishState.status === 'error' ? publishState.message : undefined;

	const replaceNavigation = useCallback(
		(href: string) => {
			if (navigate !== undefined) {
				navigate(href);
				return;
			}
			router.replace(href);
		},
		[navigate, router],
	);

	const handleNavigationAttempt = useCallback(() => {
		setIsLeaveModalOpen(true);
	}, []);

	const { cancelPendingNavigation, continuePendingNavigation, clearGuardEntry } = useUnsavedChangesGuard({
		isDirty,
		onNavigationAttempt: handleNavigationAttempt,
		onReplace: replaceNavigation,
	});

	useEffect(
		() => () => {
			if (selectedImageUrlRef.current !== null) {
				URL.revokeObjectURL(selectedImageUrlRef.current);
			}
		},
		[],
	);

	const handleOpenPublishSettings = () => {
		const document = preparePostDocument();
		if (document === null) {
			return;
		}

		setPublicationBlocks(document.blocks);
		setPublishState({ status: 'idle' });
		setIsPublishModalOpen(true);
	};

	const handleImageChange = (file: File | null) => {
		if (selectedImageUrlRef.current !== null) {
			URL.revokeObjectURL(selectedImageUrlRef.current);
		}

		const nextImageUrl = file === null ? null : URL.createObjectURL(file);
		selectedImageUrlRef.current = nextImageUrl;
		setSelectedImageUrl(nextImageUrl);
		setPublicationSettings((currentSettings) => ({
			...currentSettings,
			representativeImage: file,
			representativeImageUrl: null,
		}));
	};

	const handleCategoryChange = (category: PostCategory) => {
		setPublicationSettings((currentSettings) => ({ ...currentSettings, category }));
	};

	const handleCoLogChange = (blog: CologOption | null) => {
		setPublicationSettings((currentSettings) => ({ ...currentSettings, blog }));
		setCologError(undefined);
	};

	const handlePublish = async () => {
		if (publishState.status === 'pending') {
			return;
		}

		if (publicationSettings.blog === null) {
			setCologError('Co-log를 선택해 주세요.');
			return;
		}

		setCologError(undefined);
		setPublishState({ status: 'pending' });

		try {
			const result = await publishPost({
				document: { title: title.trim(), blocks: publicationBlocks },
				settings: publicationSettings,
			});
			const postDetailPath = buildPostDetailPath(result.slug, result.postId);
			analytics.postPublished({
				category: publicationSettings.category,
				hasCustomRepresentativeImage: publicationSettings.representativeImage !== null,
			});

			clearGuardEntry();
			markClean();
			setIsPublishModalOpen(false);

			if (selectedImageUrlRef.current !== null) {
				URL.revokeObjectURL(selectedImageUrlRef.current);
				selectedImageUrlRef.current = null;
				setSelectedImageUrl(null);
			}

			replaceNavigation(postDetailPath);
		} catch (error) {
			setPublishState({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: '발행하지 못했습니다. 입력한 내용은 유지되며 다시 시도할 수 있습니다.',
			});
		}
	};

	const handleClosePublishSettings = () => {
		setIsPublishModalOpen(false);
		setPublishState({ status: 'idle' });
	};

	const handleCancelLeave = () => {
		cancelPendingNavigation();
		setIsLeaveModalOpen(false);
	};

	const handleConfirmLeave = () => {
		setIsLeaveModalOpen(false);
		markClean();
		void continuePendingNavigation();
	};

	return {
		titleRef,
		editorRef,
		title,
		isEditorReady,
		documentErrors,
		publicationSettings,
		selectedImageUrl,
		publicationBlocks,
		isPublishModalOpen,
		isLeaveModalOpen,
		cologError,
		publishError,
		isPublishing,
		handleTitleChange,
		handleEditorReady,
		handleEditorChange,
		preparePostDocument,
		handleOpenPublishSettings,
		handleImageChange,
		handleCategoryChange,
		handleCoLogChange,
		handlePublish,
		handleClosePublishSettings,
		handleCancelLeave,
		handleConfirmLeave,
	};
}
