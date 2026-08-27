'use client';

import type { PostWriteEditorContext } from '@/features/post-write/model/post-editor';
import type { CreatePostDraft } from '@/features/post-write/model/post-write-flow';

import DraftPostActions from './DraftPostActions';

interface NewPostActionsProps {
	editor: PostWriteEditorContext;
	createDraft?: CreatePostDraft;
	onDraftCreated: (draftId: number) => void;
}

export default function NewPostActions({ editor, createDraft, onDraftCreated }: NewPostActionsProps) {
	return (
		<DraftPostActions
			isEditorReady={editor.isEditorReady}
			isPublishReady={editor.isEditorReady}
			prepareDocument={editor.prepareDocument}
			onSave={
				createDraft === undefined
					? undefined
					: async (document) => {
							const result = await createDraft(document);
							onDraftCreated(result.draftId);
						}
			}
			onPublish={editor.openPublishSettings}
		/>
	);
}
