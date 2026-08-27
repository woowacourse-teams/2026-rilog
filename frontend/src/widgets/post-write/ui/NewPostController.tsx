'use client';

import { useState, type ComponentType } from 'react';

import { getBlockCountBucket } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import { resolveRepresentativeImageSource } from '@/features/post-write/lib/resolve-representative-image';
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
	onDraftPromoted?: (draftId: number) => void;
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
	onDraftPromoted,
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
		onDraftPromoted?.(createdDraftId);
		setDraftId(createdDraftId);
		window.history.replaceState(window.history.state, '', `/write?draftId=${createdDraftId}`);
	};

	return (
		<PostWriteWorkspace
			publishPost={publishCurrentPost}
			editorComponent={editorComponent}
			initialDocument={initialDocument}
			uploadFile={uploadFile}
			navigate={navigate}
			onPublished={(result, settings, document) => {
				analytics.postPublished({
					postId: result.postId,
					ownerType: 'COLOG',
					category: settings.category,
					cologId: settings.blog?.id ?? 0,
					imageSource: resolveRepresentativeImageSource(settings, document.blocks),
					blockCountBucket: getBlockCountBucket(document.blocks.length),
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
