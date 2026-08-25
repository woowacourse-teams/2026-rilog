'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { analytics } from '@/features/analytics/model/events';
import { usePostDocument } from '@/features/post-write/hooks/use-post-document';
import { usePostPublication } from '@/features/post-write/hooks/use-post-publication';
import { usePostPublicationSettings } from '@/features/post-write/hooks/use-post-publication-settings';
import type {
	EditorDocument,
	PublicationSettings,
	PublishPost,
	PublishPostResult,
} from '@/features/post-write/model/post-publication';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { buildPostDetailPath } from '@/shared/routes/app-routes';

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

	const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
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
	const handlePublished = useCallback(
		(result: PublishPostResult, settings: PublicationSettings) => {
			const postDetailPath = buildPostDetailPath(result.slug, result.postId);
			analytics.postPublished({
				category: settings.category,
				hasCustomRepresentativeImage: settings.representativeImage !== null,
			});

			clearGuardEntry();
			markClean();
			clearSelectedImageUrl();
			replaceNavigation(postDetailPath);
		},
		[clearGuardEntry, clearSelectedImageUrl, markClean, replaceNavigation],
	);
	const {
		document: publicationDocument,
		isModalOpen: isPublishModalOpen,
		isPublishing,
		publishError,
		open: openPublication,
		close: closePublication,
		publish: publishDocument,
	} = usePostPublication({ publishPost, onPublished: handlePublished });

	const handleOpenPublishSettings = () => {
		const document = preparePostDocument();
		if (document === null) {
			return;
		}

		openPublication(document);
	};

	const handlePublish = async () => {
		if (!validatePublicationSettings()) {
			return;
		}

		await publishDocument(publicationSettings);
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
		publicationDocument,
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
		handleClosePublishSettings: closePublication,
		handleCancelLeave,
		handleConfirmLeave,
	};
}
