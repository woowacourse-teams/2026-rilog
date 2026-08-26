'use client';

import { useState, type ComponentType } from 'react';

import { analytics } from '@/features/analytics/model/events';
import type { PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import type { EditorDocument, PublishPost } from '@/features/post-write/model/post-publication';
import type { CreatePostDraft, PublishPostDraft, UpdatePostDraft } from '@/features/post-write/model/post-write-flow';

import { usePublishNewPost } from '../hooks/use-post-publishers';

import NewPostActions from './NewPostActions';
import PostWriteWorkspace from './PostWriteWorkspace';
import SavedDraftPostActions from './SavedDraftPostActions';

interface NewPostControllerProps {
	editorComponent?: ComponentType<PostEditorProps>;
	initialDocument?: EditorDocument;
	publishPost?: PublishPost;
	createDraft?: CreatePostDraft;
	updateDraft?: UpdatePostDraft;
	publishDraft?: PublishPostDraft;
	uploadFile?: UploadPostBodyFile;
	navigate?: (href: string) => void;
}

export default function NewPostController({
	editorComponent,
	initialDocument,
	publishPost,
	createDraft,
	updateDraft,
	publishDraft,
	uploadFile,
	navigate,
}: NewPostControllerProps) {
	const publishNewPost = usePublishNewPost();
	const [draftId, setDraftId] = useState<number | null>(null);

	const publishCurrentPost: PublishPost =
		draftId === null
			? (publishPost ?? publishNewPost)
			: (command) => {
					if (publishDraft === undefined) {
						throw new Error('임시저장 발행 API는 아직 연결되지 않았습니다.');
					}

					return publishDraft(draftId, command);
				};

	const handleDraftCreated = (createdDraftId: number) => {
		setDraftId(createdDraftId);
		window.history.replaceState(null, '', `/write?draftId=${createdDraftId}`);
	};

	return (
		<PostWriteWorkspace
			publishPost={publishCurrentPost}
			editorComponent={editorComponent}
			initialDocument={initialDocument}
			uploadFile={uploadFile}
			navigate={navigate}
			onPublished={(settings) => {
				analytics.postPublished({
					category: settings.category,
					hasCustomRepresentativeImage: settings.representativeImage !== null,
				});
			}}
		>
			{(editor) => {
				if (draftId !== null) {
					return <SavedDraftPostActions draftId={draftId} editor={editor} updateDraft={updateDraft} />;
				}

				return <NewPostActions editor={editor} createDraft={createDraft} onDraftCreated={handleDraftCreated} />;
			}}
		</PostWriteWorkspace>
	);
}
