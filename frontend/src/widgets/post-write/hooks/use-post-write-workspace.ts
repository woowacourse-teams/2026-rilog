'use client';

import { useCallback } from 'react';

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
	onPublished?: (settings: PublicationSettings) => void;
}

export function usePostWriteWorkspace({
	initialDocument,
	initialPublicationSettings,
	publishPost,
	navigate,
	onPublished,
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
			onPublished?.(settings);

			clearSelectedImageUrl();
			navigateAfterCompletion(postDetailPath);
		},
		[clearSelectedImageUrl, navigateAfterCompletion, onPublished],
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
		isDirty,
		document: {
			titleRef,
			editorRef,
			title,
			isEditorReady,
			errors: documentErrors,
			handleTitleChange,
			handleEditorReady,
			handleEditorChange,
			prepare: preparePostDocument,
		},
		publication: {
			settings: publicationSettings,
			representativeImagePreviewUrl,
			document: publicationDocument,
			isModalOpen: isPublishModalOpen,
			cologError,
			publishError,
			isPublishing,
			open: handleOpenPublishSettings,
			close: closePublication,
			handleImageChange,
			handleCategoryChange,
			handleCoLogChange,
			publish: handlePublish,
		},
		leaveGuard: {
			isModalOpen: isLeaveModalOpen,
			cancel: handleCancelLeave,
			confirm: handleConfirmLeave,
		},
	};
}
