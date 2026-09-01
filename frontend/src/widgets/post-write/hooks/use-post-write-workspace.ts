'use client';

import { useCallback } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import { getAnalyticsErrorProperties } from '@/features/analytics/lib/get-analytics-error-properties';
import { recordPostDetailEntryContext } from '@/features/analytics/lib/post-detail-entry-context';
import { getAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import { usePostDocument } from '@/features/post-write/hooks/use-post-document';
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
import { useActiveElapsedTime } from '@/shared/hooks/use-active-elapsed-time';
import { buildPostDetailPath } from '@/shared/routes/app-routes';

interface UsePostWriteWorkspaceOptions {
	initialDocument?: EditorDocument;
	initialPublicationSettings?: PublicationSettings;
	userSlug: string | null;
	publishPost: PublishPost;
	navigate?: (href: string) => void;
	onPublished?: (result: PublishPostResult, settings: PublicationSettings, document: EditorDocument) => void;
}

export function usePostWriteWorkspace({
	initialDocument,
	initialPublicationSettings,
	userSlug,
	publishPost,
	navigate,
	onPublished,
}: UsePostWriteWorkspaceOptions) {
	const getActiveEditingTime = useActiveElapsedTime();

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

	const {
		settings,
		representativeImagePreviewUrl,
		cologError,
		handleImageChange,
		handleCategoryChange,
		handleTargetBlogChange,
		validatePublicationSettings,
		clearSelectedImageUrl,
	} = usePostPublicationSettings({
		initialSettings: initialPublicationSettings,
		userSlug,
	});

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

			const elapsedSeconds = getActiveEditingTime() / 1_000;
			analytics.postDraftAbandoned({
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
		(result: PublishPostResult, publishedSettings: PublicationSettings, document: EditorDocument) => {
			const postDetailPath = buildPostDetailPath(result.slug, result.postId);
			recordPostDetailEntryContext({
				postId: Number(result.postId),
				entrySource: 'publish_redirect',
				feedPosition: null,
			});
			onPublished?.(result, publishedSettings, document);

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
	} = usePostPublication({
		publishPost,
		onPublished: handlePublished,
		onFailed: (error) => {
			const { errorCode, errorKind } = getAnalyticsErrorProperties(error);
			analytics.postPublishFailed({
				failureStage: getAnalyticsFailureStage(error),
				errorCode,
				errorKind,
			});
		},
	});

	const handleOpenPublishSettings = () => {
		const document = preparePostDocument();
		if (document === null) {
			analytics.postPublishValidationFailed({ invalidFields: ['title', 'body'] });
			return;
		}

		openPublication(document);
		analytics.postPublishSettingsOpened();
	};

	const handlePublish = async (targetBlogType: BlogType) => {
		if (!validatePublicationSettings(targetBlogType)) {
			analytics.postPublishValidationFailed({ invalidFields: ['colog'] });
			return;
		}

		analytics.postPublishStarted({
			ownerType: targetBlogType,
			category: settings.category,
			imageSource: resolveRepresentativeImageSource(settings, publicationDocument?.blocks ?? []),
		});
		await publishDocument(settings);
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
			markClean,
		},
		publication: {
			settings,
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
			handleTargetBlogChange,
			publish: handlePublish,
		},
		leaveGuard: {
			isModalOpen: isLeaveModalOpen,
			cancel: handleCancelLeave,
			confirm: handleConfirmLeave,
		},
	};
}

export type PostWriteWorkspaceState = ReturnType<typeof usePostWriteWorkspace>;
