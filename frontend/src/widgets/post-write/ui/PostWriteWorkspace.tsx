'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { ComponentType } from 'react';

import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
import { consumeEditorEntryContext } from '@/features/analytics/lib/editor-entry-context';
import { withAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import { findFirstBodyImageUrl } from '@/features/post-write/lib/resolve-representative-image';
import type { PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import type { EditorDocument, PublicationSettings, PublishPost } from '@/features/post-write/model/post-publication';
import DraftListModal from '@/features/post-write/ui/DraftListModal';
import DynamicBlockNoteEditor from '@/features/post-write/ui/DynamicBlockNoteEditor';
import PostBodyField from '@/features/post-write/ui/PostBodyField';
import PostTitleField from '@/features/post-write/ui/PostTitleField';
import PublishSettingsModal from '@/features/post-write/ui/PublishSettingsModal';
import WritePublishActionBar from '@/features/post-write/ui/WritePublishActionBar';
import { usePublishPostMutation } from '@/shared/api/posts/mutations/use-publish-post-mutation';
import { useUpdatePostMutation } from '@/shared/api/posts/mutations/use-update-post-mutation';
import type { PostWriteRequest } from '@/shared/api/posts/types';
import { useUploadFileMutation } from '@/shared/api/uploads/mutations/use-upload-file-mutation';
import { useMyCologsPreviewQuery } from '@/shared/api/users/queries/my-cologs-preview/use-query';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';
import { getImageUrl } from '@/shared/utils/get-image-url';

import { usePostWriteWorkspace } from '../hooks/use-post-write-workspace';

interface PostWriteWorkspaceProps {
	postId?: number;
	editorComponent?: ComponentType<PostEditorProps>;
	initialDocument?: EditorDocument;
	initialPublicationSettings?: PublicationSettings;
	publishPost?: PublishPost;
	uploadFile?: UploadPostBodyFile;
	navigate?: (href: string) => void;
}

export default function PostWriteWorkspace({
	postId,
	editorComponent = DynamicBlockNoteEditor,
	initialDocument,
	initialPublicationSettings,
	publishPost,
	uploadFile,
	navigate,
}: PostWriteWorkspaceProps) {
	const isEditMode = postId !== undefined;

	const { data: myCologsResponse } = useMyCologsPreviewQuery();
	const hasTrackedEditorOpenRef = useRef(false);

	useEffect(() => {
		if (myCologsResponse === undefined || hasTrackedEditorOpenRef.current) {
			return;
		}

		analytics.postEditorOpened({
			entrySource: consumeEditorEntryContext(),
			availableBlogCount: myCologsResponse.data?.length ?? null,
		});
		hasTrackedEditorOpenRef.current = true;
	}, [myCologsResponse]);
	const { mutateAsync: uploadFileToStorage } = useUploadFileMutation();
	const { mutateAsync: requestPostPublication } = usePublishPostMutation();
	const { mutateAsync: requestPostUpdate } = useUpdatePostMutation();

	const uploadPostBodyFileWithApi = useCallback<UploadPostBodyFile>(
		async (file) => {
			const uploadType = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
			const { objectKey } = await uploadFileToStorage({ file, type: uploadType });

			return getImageUrl(objectKey);
		},
		[uploadFileToStorage],
	);
	const resolvedUploadFile = uploadFile ?? uploadPostBodyFileWithApi;

	const cologOptions = useMemo(() => {
		const availableBlogs =
			myCologsResponse?.data?.map(({ cologId, slug, name }) => ({ id: cologId, slug, name })) ?? [];
		const initialBlog = initialPublicationSettings?.blog;

		if (initialBlog === null || initialBlog === undefined || availableBlogs.some(({ id }) => id === initialBlog.id)) {
			return availableBlogs;
		}

		return [initialBlog, ...availableBlogs];
	}, [initialPublicationSettings?.blog, myCologsResponse?.data]);

	const publishPostWithApi: PublishPost = async ({ document, settings }) => {
		if (settings.blog === null) {
			throw new Error('Co-log를 선택해 주세요.');
		}

		let thumbnailImageUrl =
			settings.representativeImageUrl ?? findFirstBodyImageUrl(document.blocks) ?? POST_THUMBNAIL_FALLBACK_URL;
		if (settings.representativeImage !== null) {
			try {
				thumbnailImageUrl = (await uploadFileToStorage({ file: settings.representativeImage, type: 'IMAGE' }))
					.objectKey;
			} catch (error) {
				throw withAnalyticsFailureStage(error, 'representative_image_upload');
			}
		}

		const request: PostWriteRequest = {
			slug: settings.blog.slug,
			title: document.title,
			content: document.blocks,
			category: settings.category === 'IT' ? 'TECH' : settings.category,
			// TODO: 공개 범위 선택 UI가 추가되면 사용자 선택값으로 교체한다.
			visibility: 'PUBLIC',
			thumbnailImageUrl,
		};
		let response;
		try {
			response = isEditMode ? await requestPostUpdate({ postId, request }) : await requestPostPublication(request);
		} catch (error) {
			throw withAnalyticsFailureStage(error, 'publish_request');
		}

		if (response.data === undefined) {
			throw withAnalyticsFailureStage(new Error('발행 응답에 게시글 정보가 없습니다.'), 'publish_response');
		}

		return {
			postId: String(response.data.postId),
			slug: response.data.slug,
		};
	};

	const {
		isDirty,
		document: postDocument,
		publication,
		leaveGuard,
		drafts,
	} = usePostWriteWorkspace({
		isEditMode,
		initialDocument,
		initialPublicationSettings,
		publishPost: publishPost ?? publishPostWithApi,
		navigate,
	});

	return (
		<div className="min-h-dvh bg-background text-text-primary">
			<WritePublishActionBar
				isEditMode={isEditMode}
				isEditorReady={postDocument.isEditorReady}
				isPublishReady={postDocument.isEditorReady && (!isEditMode || isDirty)}
				draftCount={drafts.posts.length}
				onPublish={publication.open}
				onDraftSave={drafts.save}
				onDraftListShow={drafts.openList}
			/>
			<main className="mx-auto w-full max-w-4xl px-4 pt-10 pb-[calc(6.5rem+env(safe-area-inset-bottom))] min-[512px]:pb-10 sm:px-8 sm:py-16">
				<div className="min-h-136 px-5 py-8 sm:px-10 sm:py-12">
					<PostTitleField
						value={postDocument.title}
						error={postDocument.errors.title}
						inputRef={postDocument.titleRef}
						onChange={postDocument.handleTitleChange}
						onEnter={() => postDocument.editorRef.current?.focus()}
					/>
					<div className="my-7 h-px bg-border-default" />
					<PostBodyField
						editorComponent={editorComponent}
						editorRef={postDocument.editorRef}
						initialBlocks={initialDocument?.blocks}
						error={postDocument.errors.body}
						onReady={postDocument.handleEditorReady}
						onChange={postDocument.handleEditorChange}
						uploadFile={resolvedUploadFile}
					/>
				</div>
			</main>

			<PublishSettingsModal
				open={publication.isModalOpen}
				postTitle={publication.document?.title ?? postDocument.title.trim()}
				settings={publication.settings}
				selectedImageUrl={publication.representativeImagePreviewUrl}
				bodyBlocks={publication.document?.blocks ?? []}
				defaultImageUrl={POST_THUMBNAIL_FALLBACK_URL}
				cologOptions={cologOptions}
				cologError={publication.cologError}
				publishError={publication.publishError}
				isPublishing={publication.isPublishing}
				onClose={publication.close}
				onCategoryChange={publication.handleCategoryChange}
				onCoLogChange={publication.handleCoLogChange}
				onImageChange={publication.handleImageChange}
				onPublish={() => void publication.publish()}
			/>

			<DraftListModal
				open={drafts.isListModalOpen}
				draftPosts={drafts.posts}
				onClose={drafts.closeList}
				onDelete={drafts.requestDeletion}
			/>

			<ConfirmModal
				open={drafts.isDeletionModalOpen}
				title="임시 저장 글을 삭제할까요?"
				description="삭제한 임시 저장 글은 복구할 수 없습니다."
				confirmLabel="삭제"
				cancelLabel="취소"
				variant="danger"
				onConfirm={drafts.confirmDeletion}
				onCancel={drafts.cancelDeletion}
			/>

			<ConfirmModal
				open={leaveGuard.isModalOpen}
				title="작성 중인 글을 나갈까요?"
				description="저장되지 않은 내용은 복구할 수 없습니다."
				confirmLabel="나가기"
				cancelLabel="계속 작성"
				variant="danger"
				onConfirm={leaveGuard.confirm}
				onCancel={leaveGuard.cancel}
			/>
		</div>
	);
}
