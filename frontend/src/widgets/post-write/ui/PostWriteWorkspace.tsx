'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { ComponentType, ReactNode } from 'react';

import { consumeEditorEntryContext } from '@/features/analytics/lib/editor-entry-context';
import { analytics } from '@/features/analytics/model/events';
import type {
	PostEditorProps,
	PostWriteEditorContext,
	UploadPostBodyFile,
} from '@/features/post-write/model/post-editor';
import type {
	EditorDocument,
	PublicationSettings,
	PublishPost,
	PublishPostResult,
} from '@/features/post-write/model/post-publication';
import { useUploadFileMutation } from '@/shared/api/uploads/mutations/use-upload-file-mutation';
import { useMyCologsOverviewQuery } from '@/shared/api/users/queries/my-cologs-overview/use-query';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';
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
	onPublished?: (result: PublishPostResult, settings: PublicationSettings, document: EditorDocument) => void;
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
	const { data: myInfoResponse } = useMyInfoQuery();
	const { data: myCologsResponse } = useMyCologsOverviewQuery();
	const hasTrackedEditorOpenRef = useRef(false);

	useEffect(() => {
		if (myCologsResponse === undefined || hasTrackedEditorOpenRef.current) return;

		analytics.postEditorOpened({
			entrySource: consumeEditorEntryContext(),
			availableBlogCount: myCologsResponse.data?.length ?? null,
		});
		hasTrackedEditorOpenRef.current = true;
	}, [myCologsResponse]);

	const { mutateAsync: uploadFileToStorage } = useUploadFileMutation();

	const uploadPostBodyFileWithApi = useCallback<UploadPostBodyFile>(
		async (file) => {
			const uploadType = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
			const { objectKey } = await uploadFileToStorage({ file, type: uploadType });

			return getImageUrl(objectKey);
		},
		[uploadFileToStorage],
	);

	const userSlug = myInfoResponse?.data?.slug ?? null;

	const cologOptions = useMemo(() => {
		const availableBlogs =
			myCologsResponse?.data?.map(({ cologId, slug, name }) => ({ id: cologId, slug, name })) ?? [];
		const initialTarget = initialPublicationSettings?.blog;

		if (initialTarget?.type !== 'COLOG' || availableBlogs.some(({ id }) => id === initialTarget.id)) {
			return availableBlogs;
		}

		return availableBlogs;
	}, [initialPublicationSettings?.blog, myCologsResponse?.data]);

	const workspace = usePostWriteWorkspace({
		initialDocument,
		initialPublicationSettings,
		userSlug,
		publishPost,
		navigate,
		onPublished,
	});

	return (
		<>
			<PostEditor
				workspace={workspace}
				cologOptions={cologOptions}
				userSlug={userSlug}
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
