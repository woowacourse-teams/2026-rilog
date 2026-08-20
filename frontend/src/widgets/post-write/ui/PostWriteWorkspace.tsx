'use client';

import type { ComponentType } from 'react';
import { useCallback, useMemo } from 'react';

import type { PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import type { PublishPost } from '@/features/post-write/model/post-publication';
import DynamicBlockNoteEditor from '@/features/post-write/ui/DynamicBlockNoteEditor';
import PostBodyField from '@/features/post-write/ui/PostBodyField';
import PostTitleField from '@/features/post-write/ui/PostTitleField';
import PublishSettingsModal from '@/features/post-write/ui/PublishSettingsModal';
import WritePublishActionBar from '@/features/post-write/ui/WritePublishActionBar';
import { usePublishPostMutation } from '@/shared/api/blogs/mutations/use-publish-post-mutation';
import { useUploadFileMutation } from '@/shared/api/uploads/mutations/use-upload-file-mutation';
import { useMyCologsPreviewQuery } from '@/shared/api/users/queries/my-cologs-preview/use-query';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';
import { getImageUrl } from '@/shared/utils/get-image-url';

import { usePostWriteWorkspace } from '../hooks/use-post-write-workspace';

const DEFAULT_POST_COVER_PATH = '/images/default-post-cover.svg';

interface PostWriteWorkspaceProps {
	editorComponent?: ComponentType<PostEditorProps>;
	publishPost?: PublishPost;
	uploadFile?: UploadPostBodyFile;
	navigate?: (href: string) => void;
}

export default function PostWriteWorkspace({
	editorComponent = DynamicBlockNoteEditor,
	publishPost,
	uploadFile,
	navigate,
}: PostWriteWorkspaceProps) {
	const { data: myInfoResponse } = useMyInfoQuery();
	const { data: myCologsResponse } = useMyCologsPreviewQuery();
	const { mutateAsync: uploadFileToStorage } = useUploadFileMutation();
	const { mutateAsync: requestPostPublication } = usePublishPostMutation();
	const uploadPostBodyFileWithApi = useCallback<UploadPostBodyFile>(
		async (file) => {
			const { objectKey } = await uploadFileToStorage({ file, type: 'IMAGE' });

			return getImageUrl(objectKey);
		},
		[uploadFileToStorage],
	);
	const resolvedUploadFile = uploadFile ?? uploadPostBodyFileWithApi;

	const myInfo = myInfoResponse?.data;
	const cologOptions = useMemo(() => {
		const personalBlog = myInfo === undefined ? [] : [{ id: myInfo.id, slug: myInfo.slug, name: '내 블로그' }];
		const teamBlogs = myCologsResponse?.data?.map(({ cologId, slug, name }) => ({ id: cologId, slug, name })) ?? [];

		return [...personalBlog, ...teamBlogs];
	}, [myCologsResponse?.data, myInfo]);

	const publishPostWithApi: PublishPost = async ({ document, settings }) => {
		if (settings.blog === null) {
			throw new Error('Co-log를 선택해 주세요.');
		}

		const thumbnailImageUrl =
			settings.representativeImage === null
				? null
				: (
						await uploadFileToStorage({
							file: settings.representativeImage,
							type: 'IMAGE',
						})
					).objectKey;

		const response = await requestPostPublication({
			slug: settings.blog.slug,
			request: {
				title: document.title,
				content: document.blocks,
				category: settings.category === 'IT' ? 'TECH' : settings.category,
				// TODO: 공개 범위 선택 UI가 추가되면 사용자 선택값으로 교체한다.
				visibility: 'PUBLIC',
				thumbnailImageUrl,
				profileImageUrl: myInfo?.profileImageUrl ?? null,
			},
		});

		if (response.data === undefined) {
			throw new Error('발행 응답에 게시글 정보가 없습니다.');
		}

		return {
			postId: String(response.data.postId),
			slug: response.data.slug,
		};
	};

	const {
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
		handleOpenPublishSettings,
		handleImageChange,
		handleCategoryChange,
		handleCoLogChange,
		handlePublish,
		handleClosePublishSettings,
		handleCancelLeave,
		handleConfirmLeave,
	} = usePostWriteWorkspace({ publishPost: publishPost ?? publishPostWithApi, navigate });

	return (
		<div className="min-h-dvh bg-background text-text-primary">
			<WritePublishActionBar isEditorReady={isEditorReady} onPublish={handleOpenPublishSettings} />
			<main className="mx-auto w-full max-w-4xl px-4 pt-10 pb-[calc(6.5rem+env(safe-area-inset-bottom))] min-[512px]:pb-10 sm:px-8 sm:py-16">
				<div className="min-h-136 px-5 py-8 sm:px-10 sm:py-12">
					<PostTitleField
						value={title}
						error={documentErrors.title}
						inputRef={titleRef}
						onChange={handleTitleChange}
						onEnter={() => editorRef.current?.focus()}
					/>
					<div className="my-7 h-px bg-border-default" />
					<PostBodyField
						editorComponent={editorComponent}
						editorRef={editorRef}
						error={documentErrors.body}
						onReady={handleEditorReady}
						onChange={handleEditorChange}
						uploadFile={resolvedUploadFile}
					/>
				</div>
			</main>

			<PublishSettingsModal
				open={isPublishModalOpen}
				postTitle={title.trim()}
				settings={publicationSettings}
				selectedImageUrl={selectedImageUrl}
				bodyBlocks={publicationBlocks}
				defaultImageUrl={DEFAULT_POST_COVER_PATH}
				cologOptions={cologOptions}
				cologError={cologError}
				publishError={publishError}
				isPublishing={isPublishing}
				onClose={handleClosePublishSettings}
				onCategoryChange={handleCategoryChange}
				onCoLogChange={handleCoLogChange}
				onImageChange={handleImageChange}
				onPublish={() => void handlePublish()}
			/>

			<ConfirmModal
				open={isLeaveModalOpen}
				title="작성 중인 글을 나갈까요?"
				description="저장되지 않은 내용은 복구할 수 없습니다."
				confirmLabel="나가기"
				cancelLabel="계속 작성"
				variant="danger"
				onConfirm={handleConfirmLeave}
				onCancel={handleCancelLeave}
			/>
		</div>
	);
}
