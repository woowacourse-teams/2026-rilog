'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import type { Block } from '@blocknote/core';

import { analytics } from '@/features/analytics/model/events';
import { usePostDocument } from '@/features/post-write/hooks/use-post-document';
import { usePostPublicationSettings } from '@/features/post-write/hooks/use-post-publication-settings';
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

export function usePostWriteWorkspace({
	initialDocument,
	initialPublicationSettings,
	publishPost,
	navigate,
}: UsePostWriteWorkspaceOptions) {
	const router = useRouter();

	const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
	const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

	const [publicationBlocks, setPublicationBlocks] = useState<Block[]>([]);
	const [publishState, setPublishState] = useState<PublishState>({ status: 'idle' });
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
	const {
		settings: publicationSettings,
		representativeImagePreviewUrl,
		cologError,
		handleImageChange,
		handleCategoryChange,
		handleCoLogChange,
		validatePublicationSettings,
		clearSelectedImageUrl,
	} = usePostPublicationSettings({ initialSettings: initialPublicationSettings });

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

	const handleOpenPublishSettings = () => {
		const document = preparePostDocument();
		if (document === null) {
			return;
		}

		setPublicationBlocks(document.blocks);
		setPublishState({ status: 'idle' });
		setIsPublishModalOpen(true);
	};

	const handlePublish = async () => {
		if (publishState.status === 'pending') {
			return;
		}

		if (!validatePublicationSettings()) {
			return;
		}

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

			clearSelectedImageUrl();

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
		representativeImagePreviewUrl,
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
