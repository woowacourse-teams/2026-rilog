'use client';

import type { ComponentType } from 'react';

import { getBlockCountBucket } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import { resolveRepresentativeImageSource } from '@/features/post-write/lib/resolve-representative-image';
import type { PostEditorProps, UploadPostBodyFile } from '@/features/post-write/model/post-editor';
import type { EditorDocument, PublicationSettings } from '@/features/post-write/model/post-publication';
import type { PublishPostDraft, UpdatePostDraft } from '@/features/post-write/model/post-write-flow';

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
	return (
		<PostWriteWorkspace
			publishPost={(command) => {
				if (publishDraft === undefined) {
					throw new Error('임시저장 발행 API는 아직 연결되지 않았습니다.');
				}

				return publishDraft(draftId, command);
			}}
			initialDocument={initialDocument}
			initialPublicationSettings={initialPublicationSettings}
			editorComponent={editorComponent}
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
			{(editor) => <SavedDraftPostActions draftId={draftId} editor={editor} updateDraft={updateDraft} />}
		</PostWriteWorkspace>
	);
}
