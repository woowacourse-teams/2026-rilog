'use client';

import type { ComponentType } from 'react';

import { getBlockCountBucket } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import { useUpdatePostDraft } from '@/features/post-write/hooks/use-update-post-draft';
import { resolveRepresentativeImageSource } from '@/features/post-write/lib/resolve-representative-image';
import type { PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import type { EditorDocument, PublicationSettings } from '@/features/post-write/model/post-publication';
import type { PublishPostDraft, UpdatePostDraft } from '@/features/post-write/model/post-write-flow';

import { usePublishPostDraft } from '../hooks/use-post-publishers';

import PostWriteWorkspace from './PostWriteWorkspace';
import SavedDraftPostActions from './SavedDraftPostActions';

interface DraftPostControllerProps {
	draftId: number;
	initialDocument?: EditorDocument;
	initialPublicationSettings?: PublicationSettings;
	updateDraft?: UpdatePostDraft;
	publishDraft?: PublishPostDraft;
	editorComponent?: ComponentType<PostEditorProps>;
	uploadFile?: UploadPostBodyFile;
	navigate?: (href: string) => void;
}

export default function DraftPostController({
	draftId,
	initialDocument,
	initialPublicationSettings,
	updateDraft,
	publishDraft,
	editorComponent,
	uploadFile,
	navigate,
}: DraftPostControllerProps) {
	const updatePostDraft = useUpdatePostDraft();
	const publishSavedDraft = usePublishPostDraft();

	return (
		<PostWriteWorkspace
			publishPost={(command) => (publishDraft ?? publishSavedDraft)(draftId, command)}
			initialDocument={initialDocument}
			initialPublicationSettings={initialPublicationSettings}
			editorComponent={editorComponent}
			uploadFile={uploadFile}
			navigate={navigate}
			onPublished={(result, settings, document) => {
				const targetBlog = settings.blog;
				if (targetBlog === null) {
					return;
				}

				analytics.postPublished({
					postId: result.postId,
					ownerType: targetBlog.type,
					category: settings.category,
					cologId: targetBlog.type === 'COLOG' ? targetBlog.id : null,
					imageSource: resolveRepresentativeImageSource(settings, document.blocks),
					blockCountBucket: getBlockCountBucket(document.blocks.length),
				});
			}}
		>
			{(editor) => (
				<SavedDraftPostActions draftId={draftId} editor={editor} updateDraft={updateDraft ?? updatePostDraft} />
			)}
		</PostWriteWorkspace>
	);
}
