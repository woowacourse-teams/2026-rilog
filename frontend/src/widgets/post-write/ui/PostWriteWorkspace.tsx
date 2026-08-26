'use client';

import { useCallback, useMemo } from 'react';

import type { ComponentType } from 'react';

import { analytics } from '@/features/analytics/model/events';
import { buildPostWriteRequest } from '@/features/post-write/lib/build-post-write-request';
import { mapPostWriteResponse } from '@/features/post-write/lib/map-post-write-response';
import type { PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import type { EditorDocument, PublicationSettings, PublishPost } from '@/features/post-write/model/post-publication';
import { usePublishPostMutation } from '@/shared/api/posts/mutations/use-publish-post-mutation';
import { useUpdatePostMutation } from '@/shared/api/posts/mutations/use-update-post-mutation';
import { useUploadFileMutation } from '@/shared/api/uploads/mutations/use-upload-file-mutation';
import { useMyCologsPreviewQuery } from '@/shared/api/users/queries/my-cologs-preview/use-query';
import { getImageUrl } from '@/shared/utils/get-image-url';

import DraftPostActions from './DraftPostActions';
import EditPostActions from './EditPostActions';
import PostEditor from './PostEditor';

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
	editorComponent,
	initialDocument,
	initialPublicationSettings,
	publishPost,
	uploadFile,
	navigate,
}: PostWriteWorkspaceProps) {
	const isEditMode = postId !== undefined;
	const { data: myCologsResponse } = useMyCologsPreviewQuery();
	const { mutateAsync: uploadFileToStorage } = useUploadFileMutation();
	const { mutateAsync: requestPostPublication } = usePublishPostMutation();
	const { mutateAsync: requestPostUpdate } = useUpdatePostMutation();

	const uploadPostBodyFileWithApi = useCallback<UploadPostBodyFile>(
		async (file) => {
			const uploadType = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
			const { objectKey } = await uploadFileToStorage({
				file,
				type: uploadType,
			});

			return getImageUrl(objectKey);
		},
		[uploadFileToStorage],
	);

	const cologOptions = useMemo(() => {
		const availableBlogs =
			myCologsResponse?.data?.map(({ cologId, slug, name }) => ({
				id: cologId,
				slug,
				name,
			})) ?? [];
		const initialBlog = initialPublicationSettings?.blog;

		if (initialBlog === null || initialBlog === undefined || availableBlogs.some(({ id }) => id === initialBlog.id)) {
			return availableBlogs;
		}

		return [initialBlog, ...availableBlogs];
	}, [initialPublicationSettings?.blog, myCologsResponse?.data]);

	const uploadRepresentativeImage = async (file: File) =>
		(
			await uploadFileToStorage({
				file,
				type: 'IMAGE',
			})
		).objectKey;

	const publishNewPost: PublishPost = async (command) => {
		const request = await buildPostWriteRequest(command, uploadRepresentativeImage);
		return mapPostWriteResponse(await requestPostPublication(request));
	};

	const updatePublishedPost: PublishPost = async (command) => {
		if (postId === undefined) {
			throw new Error('수정할 게시글 ID가 필요합니다.');
		}

		const request = await buildPostWriteRequest(command, uploadRepresentativeImage);
		return mapPostWriteResponse(await requestPostUpdate({ postId, request }));
	};

	return (
		<PostEditor
			cologOptions={cologOptions}
			publishPost={publishPost ?? (isEditMode ? updatePublishedPost : publishNewPost)}
			uploadFile={uploadFile ?? uploadPostBodyFileWithApi}
			editorComponent={editorComponent}
			initialDocument={initialDocument}
			initialPublicationSettings={initialPublicationSettings}
			navigate={navigate}
			onPublished={
				isEditMode
					? undefined
					: (settings) => {
							analytics.postPublished({
								category: settings.category,
								hasCustomRepresentativeImage: settings.representativeImage !== null,
							});
						}
			}
		>
			{(editor) => {
				if (isEditMode) {
					return <EditPostActions editor={editor} />;
				}

				return (
					<DraftPostActions
						isEditorReady={editor.isEditorReady}
						isPublishReady={editor.isEditorReady}
						prepareDocument={editor.prepareDocument}
						onPublish={editor.openPublishSettings}
					/>
				);
			}}
		</PostEditor>
	);
}
