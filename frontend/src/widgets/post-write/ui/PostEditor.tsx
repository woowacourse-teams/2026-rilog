'use client';

import { useEffect } from 'react';

import type { ComponentType, ReactNode } from 'react';

import type { CologOption } from '@/domains/blog/model/colog';
import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
import { analytics } from '@/features/analytics/model/events';
import type {
	PostEditorProps as PostBodyEditorProps,
	PostWriteEditorContext,
	UploadPostBodyFile,
} from '@/features/post-write/model/post-editor';
import type { EditorDocument, PublicationSettings, PublishPost } from '@/features/post-write/model/post-publication';
import DynamicBlockNoteEditor from '@/features/post-write/ui/DynamicBlockNoteEditor';
import PostBodyField from '@/features/post-write/ui/PostBodyField';
import PostTitleField from '@/features/post-write/ui/PostTitleField';
import PublishSettingsModal from '@/features/post-write/ui/PublishSettingsModal';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

import { usePostWriteWorkspace } from '../hooks/use-post-write-workspace';

interface PostEditorProps {
	children: (editor: PostWriteEditorContext) => ReactNode;
	cologOptions: CologOption[];
	publishPost: PublishPost;
	uploadFile: UploadPostBodyFile;
	editorComponent?: ComponentType<PostBodyEditorProps>;
	initialDocument?: EditorDocument;
	initialPublicationSettings?: PublicationSettings;
	navigate?: (href: string) => void;
	onPublished?: (settings: PublicationSettings) => void;
}

export default function PostEditor({
	children,
	cologOptions,
	publishPost,
	uploadFile,
	editorComponent = DynamicBlockNoteEditor,
	initialDocument,
	initialPublicationSettings,
	navigate,
	onPublished,
}: PostEditorProps) {
	useEffect(() => {
		analytics.postEditorOpened();
	}, []);

	const {
		isDirty,
		document: postDocument,
		publication,
		leaveGuard,
	} = usePostWriteWorkspace({
		initialDocument,
		initialPublicationSettings,
		publishPost,
		navigate,
		onPublished,
	});

	return (
		<div className="min-h-dvh bg-background text-text-primary">
			{children({
				isEditorReady: postDocument.isEditorReady,
				isDirty,
				prepareDocument: postDocument.prepare,
				openPublishSettings: publication.open,
			})}

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
						uploadFile={uploadFile}
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
