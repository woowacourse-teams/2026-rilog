'use client';

import { useCallback, useMemo } from 'react';

import type { ComponentType, ReactNode } from 'react';

import type {
	PostEditorProps,
	PostWriteEditorContext,
	UploadPostBodyFile,
} from '@/features/post-write/model/post-editor';
import type { EditorDocument, PublicationSettings, PublishPost } from '@/features/post-write/model/post-publication';
import { useUploadFileMutation } from '@/shared/api/uploads/mutations/use-upload-file-mutation';
import { useMyCologsPreviewQuery } from '@/shared/api/users/queries/my-cologs-preview/use-query';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';
import { getImageUrl } from '@/shared/utils/get-image-url';

import { usePostWriteWorkspace } from '../hooks/use-post-write-workspace';

import PostEditor from './PostEditor';

interface PostWriteWorkspaceProps {
	children: (editor: PostWriteEditorContext) => ReactNode;
	publishPost: PublishPost;
	editorComponent?: ComponentType<PostEditorProps>;
	initialDocument?: EditorDocument;
	initialPublicationSettings?: PublicationSettings;
	uploadFile?: UploadPostBodyFile;
	navigate?: (href: string) => void;
	onPublished?: (settings: PublicationSettings) => void;
}

export default function PostWriteWorkspace({
	children,
	publishPost,
	editorComponent,
	initialDocument,
	initialPublicationSettings,
	uploadFile,
	navigate,
	onPublished,
}: PostWriteWorkspaceProps) {
	const { data: myCologsResponse } = useMyCologsPreviewQuery();
	const { mutateAsync: uploadFileToStorage } = useUploadFileMutation();

	const uploadPostBodyFileWithApi = useCallback<UploadPostBodyFile>(
		async (file) => {
			const uploadType = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
			const { objectKey } = await uploadFileToStorage({ file, type: uploadType });

			return getImageUrl(objectKey);
		},
		[uploadFileToStorage],
	);

	const cologOptions = useMemo(() => {
		const availableBlogs =
			myCologsResponse?.data?.map(({ cologId, slug, name }) => ({ id: cologId, slug, name })) ?? [];
		const initialBlog = initialPublicationSettings?.blog;

		if (initialBlog === null || initialBlog === undefined || availableBlogs.some(({ id }) => id === initialBlog.id)) {
			return availableBlogs;
		}

		return [initialBlog, ...availableBlogs];
	}, [initialPublicationSettings?.blog, myCologsResponse?.data]);

	const workspace = usePostWriteWorkspace({
		initialDocument,
		initialPublicationSettings,
		publishPost,
		navigate,
		onPublished,
	});

	return (
		<>
			<PostEditor
				workspace={workspace}
				cologOptions={cologOptions}
				uploadFile={uploadFile ?? uploadPostBodyFileWithApi}
				editorComponent={editorComponent}
				initialDocument={initialDocument}
			>
				{children}
			</PostEditor>

			<ConfirmModal
				open={workspace.leaveGuard.isModalOpen}
				title="작성 중인 글을 나갈까요?"
				description="저장되지 않은 내용은 복구할 수 없습니다."
				confirmLabel="나가기"
				cancelLabel="계속 작성"
				variant="danger"
				onConfirm={workspace.leaveGuard.confirm}
				onCancel={workspace.leaveGuard.cancel}
			/>
		</>
	);
}
