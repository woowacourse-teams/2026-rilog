'use client';

import { useCallback } from 'react';

import { analytics } from '@/features/analytics/model/events';
import { usePostDocument } from '@/features/post-write/hooks/use-post-document';
import { usePostPublication } from '@/features/post-write/hooks/use-post-publication';
import { usePostPublicationSettings } from '@/features/post-write/hooks/use-post-publication-settings';
import { usePostWriteLeaveGuard } from '@/features/post-write/hooks/use-post-write-leave-guard';
import type {
	EditorDocument,
	PublicationSettings,
	PublishPost,
	PublishPostResult,
} from '@/features/post-write/model/post-publication';
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
	const {
		isLeaveModalOpen,
		cancelLeave: handleCancelLeave,
		confirmLeave: handleConfirmLeave,
		navigateAfterCompletion,
	} = usePostWriteLeaveGuard({
		isDirty,
		markClean,
		navigate,
	});
	const handlePublished = useCallback(
		(result: PublishPostResult, settings: PublicationSettings) => {
			const postDetailPath = buildPostDetailPath(result.slug, result.postId);
			analytics.postPublished({
				category: settings.category,
				hasCustomRepresentativeImage: settings.representativeImage !== null,
			});

			clearSelectedImageUrl();
			navigateAfterCompletion(postDetailPath);
		},
		[clearSelectedImageUrl, navigateAfterCompletion],
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
