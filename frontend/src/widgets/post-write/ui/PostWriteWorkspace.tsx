'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ComponentType } from 'react';

import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
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
import { usePublishPostMutation } from '@/shared/api/blogs/mutations/use-publish-post-mutation';
import { useUploadFileMutation } from '@/shared/api/uploads/mutations/use-upload-file-mutation';
import { useMyCologsPreviewQuery } from '@/shared/api/users/queries/my-cologs-preview/use-query';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';
import { getImageUrl } from '@/shared/utils/get-image-url';

import { usePostWriteWorkspace } from '../hooks/use-post-write-workspace';

interface PostWriteWorkspaceProps {
	editorComponent?: ComponentType<PostEditorProps>;
	initialDocument?: EditorDocument;
	initialPublicationSettings?: PublicationSettings;
	publishPost?: PublishPost;
	uploadFile?: UploadPostBodyFile;
	navigate?: (href: string) => void;
}

export default function PostWriteWorkspace({
	editorComponent = DynamicBlockNoteEditor,
	initialDocument,
	initialPublicationSettings,
	publishPost,
	uploadFile,
	navigate,
}: PostWriteWorkspaceProps) {
	useEffect(() => {
		analytics.postEditorOpened();
	}, []);

	const { data: myInfoResponse } = useMyInfoQuery();
	const { data: myCologsResponse } = useMyCologsPreviewQuery();
	const { mutateAsync: uploadFileToStorage } = useUploadFileMutation();
	const { mutateAsync: requestPostPublication } = usePublishPostMutation();

	const uploadPostBodyFileWithApi = useCallback<UploadPostBodyFile>(
		async (file) => {
			const uploadType = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
			const { objectKey } = await uploadFileToStorage({ file, type: uploadType });

			return getImageUrl(objectKey);
		},
		[uploadFileToStorage],
	);
	const resolvedUploadFile = uploadFile ?? uploadPostBodyFileWithApi;

	const myInfo = myInfoResponse?.data;
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

		const thumbnailImageUrl =
			settings.representativeImage !== null
				? (
						await uploadFileToStorage({
							file: settings.representativeImage,
							type: 'IMAGE',
						})
					).objectKey
				: (settings.representativeImageUrl ?? findFirstBodyImageUrl(document.blocks) ?? POST_THUMBNAIL_FALLBACK_URL);

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
	} = usePostWriteWorkspace({
		initialDocument,
		initialPublicationSettings,
		publishPost: publishPost ?? publishPostWithApi,
		navigate,
	});

	// TODO: 임시 저장 API 연동 시 아래 상태와 핸들러를 draft 전용 hook으로 분리한다.
	const [draftPosts, setDraftPosts] = useState([
		{ id: 34, title: '디자인 시스템 도입 회고', draftedAt: '2026-08-21T04:40:07.585624' },
		{ id: 37, title: 'TypeScript 타입 설계 회고', draftedAt: '2026-08-20T04:40:07.585624' },
		{ id: 21, title: '접근성 개선 기록', draftedAt: '2026-08-19T04:40:07.585624' },
		{ id: 4, title: 'Next.js 마이그레이션', draftedAt: '2026-08-18T04:40:07.585624' },
	]);
	const [isDraftListModalOpen, setIsDraftListModalOpen] = useState(false);
	const [draftPostIdPendingDeletion, setDraftPostIdPendingDeletion] = useState<number | null>(null);

	const handleDraftSave = () => {};
	const requestDraftPostDeletion = (draftPostId: number) => {
		setDraftPostIdPendingDeletion(draftPostId);
	};
	const cancelDraftPostDeletion = () => {
		setDraftPostIdPendingDeletion(null);
	};
	const confirmDraftPostDeletion = () => {
		if (draftPostIdPendingDeletion === null) {
			return;
		}

		setDraftPosts((currentDraftPosts) =>
			currentDraftPosts.filter((draftPost) => draftPost.id !== draftPostIdPendingDeletion),
		);
		setDraftPostIdPendingDeletion(null);
	};

	return (
		<div className="min-h-dvh bg-background text-text-primary">
			<WritePublishActionBar
				isEditorReady={isEditorReady}
				draftCount={draftPosts.length}
				onPublish={handleOpenPublishSettings}
				onDraftSave={handleDraftSave}
				onDraftListShow={() => setIsDraftListModalOpen(true)}
			/>
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
						initialBlocks={initialDocument?.blocks}
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
				selectedImageUrl={selectedImageUrl ?? publicationSettings.representativeImageUrl}
				bodyBlocks={publicationBlocks}
				defaultImageUrl={POST_THUMBNAIL_FALLBACK_URL}
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

			<DraftListModal
				open={isDraftListModalOpen}
				draftPosts={draftPosts}
				onClose={() => setIsDraftListModalOpen(false)}
				onDelete={requestDraftPostDeletion}
			/>

			<ConfirmModal
				open={draftPostIdPendingDeletion !== null}
				title="임시 저장 글을 삭제할까요?"
				description="삭제한 임시 저장 글은 복구할 수 없습니다."
				confirmLabel="삭제"
				cancelLabel="취소"
				variant="danger"
				onConfirm={confirmDraftPostDeletion}
				onCancel={cancelDraftPostDeletion}
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
