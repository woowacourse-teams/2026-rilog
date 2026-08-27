'use client';

import type { PostWriteWorkspaceState } from '../hooks/use-post-write-workspace';
import type { ComponentType, ReactNode } from 'react';

import type { CologOption } from '@/domains/blog/model/colog';
import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
import type {
	PostEditorProps as PostBodyEditorProps,
	PostWriteEditorContext,
	UploadPostBodyFile,
} from '@/features/post-write/model/post-editor';
import type { EditorDocument } from '@/features/post-write/model/post-publication';
import DynamicBlockNoteEditor from '@/features/post-write/ui/DynamicBlockNoteEditor';
import PostBodyField from '@/features/post-write/ui/PostBodyField';
import PostTitleField from '@/features/post-write/ui/PostTitleField';
import PublishSettingsModal from '@/features/post-write/ui/PublishSettingsModal';

interface PostEditorProps {
	children: (editor: PostWriteEditorContext) => ReactNode;
	cologOptions: CologOption[];
	workspace: PostWriteWorkspaceState;
	uploadFile: UploadPostBodyFile;
	editorComponent?: ComponentType<PostBodyEditorProps>;
	initialDocument?: EditorDocument;
}

export default function PostEditor({
	children,
	cologOptions,
	workspace,
	uploadFile,
	editorComponent = DynamicBlockNoteEditor,
	initialDocument,
}: PostEditorProps) {
	const { isDirty, document: postDocument, publication } = workspace;

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
		</div>
	);
}
