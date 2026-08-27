'use client';

import { useCallback, useEffect, useRef } from 'react';

import { getAnalyticsErrorProperties } from '@/features/analytics/lib/get-analytics-error-properties';
import { recordPostDetailEntryContext } from '@/features/analytics/lib/post-detail-entry-context';
import { getAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import { usePostDocument } from '@/features/post-write/hooks/use-post-document';
import { usePostDrafts } from '@/features/post-write/hooks/use-post-drafts';
import { usePostPublication } from '@/features/post-write/hooks/use-post-publication';
import { usePostPublicationSettings } from '@/features/post-write/hooks/use-post-publication-settings';
import { usePostWriteLeaveGuard } from '@/features/post-write/hooks/use-post-write-leave-guard';
import { resolveRepresentativeImageSource } from '@/features/post-write/lib/resolve-representative-image';
import type {
	EditorDocument,
	PublicationSettings,
	PublishPost,
	PublishPostResult,
} from '@/features/post-write/model/post-publication';
import { buildPostDetailPath } from '@/shared/routes/app-routes';

const getBlockCountBucket = (count: number) => {
	if (count <= 5) return '1-5';
	if (count <= 10) return '6-10';
	if (count <= 20) return '11-20';
	return '21+';
};

interface UsePostWriteWorkspaceOptions {
	isEditMode?: boolean;
	initialDocument?: EditorDocument;
	initialPublicationSettings?: PublicationSettings;
	publishPost: PublishPost;
	navigate?: (href: string) => void;
}

export function usePostWriteWorkspace({
	isEditMode = false,
	initialDocument,
	initialPublicationSettings,
	publishPost,
	navigate,
}: UsePostWriteWorkspaceOptions) {
	const editorOpenedAtRef = useRef<number | null>(null);
	useEffect(() => {
		editorOpenedAtRef.current = Date.now();
	}, []);
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
		getDocumentState,
	} = usePostDocument({ initialDocument });

	const drafts = usePostDrafts({ prepareDocument: preparePostDocument });

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
		onConfirmLeave: () => {
			const { hasTitle, hasBody } = getDocumentState();
			if (!hasTitle && !hasBody) return;
			const elapsedSeconds = (Date.now() - (editorOpenedAtRef.current ?? Date.now())) / 1_000;
			analytics.postDraftAbandoned?.({
				documentState: hasTitle && hasBody ? 'title_and_body' : hasTitle ? 'title_only' : 'body_only',
				editingTimeBucket:
					elapsedSeconds < 60
						? 'under_1m'
						: elapsedSeconds < 300
							? '1_to_5m'
							: elapsedSeconds < 900
								? '5_to_15m'
								: '15m_plus',
			});
		},
	});

	const handlePublished = useCallback(
		(result: PublishPostResult, settings: PublicationSettings, document: EditorDocument) => {
			const postDetailPath = buildPostDetailPath(result.slug, result.postId);
			if (!isEditMode) {
				analytics.postPublished({
					postId: result.postId,
					ownerType: 'COLOG',
					category: settings.category,
					cologId: settings.blog?.id ?? 0,
					imageSource: resolveRepresentativeImageSource(settings, document.blocks),
					blockCountBucket: getBlockCountBucket(document.blocks.length),
				});
			}
			recordPostDetailEntryContext({
				postId: Number(result.postId),
				entrySource: 'publish_redirect',
				feedPosition: null,
			});

			clearSelectedImageUrl();
			navigateAfterCompletion(postDetailPath);
		},
		[clearSelectedImageUrl, isEditMode, navigateAfterCompletion],
	);

	const {
		document: publicationDocument,
		isModalOpen: isPublishModalOpen,
		isPublishing,
		publishError,
		open: openPublication,
		close: closePublication,
		publish: publishDocument,
	} = usePostPublication({
		publishPost,
		onPublished: handlePublished,
		onFailed: (error) => {
			const { errorCode, errorKind } = getAnalyticsErrorProperties(error);
			const failureStage = getAnalyticsFailureStage(error);
			analytics.postPublishFailed?.({ failureStage, errorCode, errorKind });
		},
	});

	const handleOpenPublishSettings = () => {
		const document = preparePostDocument();
		if (document === null) {
			analytics.postPublishValidationFailed?.({ invalidFields: ['title', 'body'] });
			return;
		}

		openPublication(document);
		analytics.postPublishSettingsOpened?.();
	};

	const handlePublish = async () => {
		if (!validatePublicationSettings()) {
			analytics.postPublishValidationFailed?.({ invalidFields: ['colog'] });
			return;
		}

		analytics.postPublishStarted?.({
			ownerType: 'COLOG',
			category: publicationSettings.category,
			imageSource: resolveRepresentativeImageSource(publicationSettings, publicationDocument?.blocks ?? []),
		});

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
		drafts,
	};
}
