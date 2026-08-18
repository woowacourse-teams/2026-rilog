'use client';

import type { ComponentType } from 'react';

import { COLOG_OPTIONS_MOCK } from '@/features/post-write/lib/mock-colog-options';
import { mockPublishPost } from '@/features/post-write/lib/mock-publish-post';
import { mockUploadPostBodyFile } from '@/features/post-write/lib/mock-upload-post-body-file';
import type { PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import type { PublishPost } from '@/features/post-write/model/post-publication';
import DynamicBlockNoteEditor from '@/features/post-write/ui/DynamicBlockNoteEditor';
import PostBodyField from '@/features/post-write/ui/PostBodyField';
import PostTitleField from '@/features/post-write/ui/PostTitleField';
import PublishSettingsModal from '@/features/post-write/ui/PublishSettingsModal';
import WritePublishActionBar from '@/features/post-write/ui/WritePublishActionBar';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

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
	publishPost = mockPublishPost,
	uploadFile = mockUploadPostBodyFile,
	navigate,
}: PostWriteWorkspaceProps) {
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
	} = usePostWriteWorkspace({ publishPost, navigate });

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
						uploadFile={uploadFile}
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
				cologOptions={COLOG_OPTIONS_MOCK}
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
