'use client';

import type { PostWriteEditorContext } from '@/features/post-write/model/post-editor';
import type { UpdatePostDraft } from '@/features/post-write/model/post-write-flow';

import DraftPostActions from './DraftPostActions';

interface SavedDraftPostActionsProps {
	draftId: number;
	editor: PostWriteEditorContext;
	updateDraft?: UpdatePostDraft;
}

export default function SavedDraftPostActions({ draftId, editor, updateDraft }: SavedDraftPostActionsProps) {
	const isActionReady = editor.isEditorReady && !editor.isMediaImporting;

	return (
		<DraftPostActions
			selectedDraftId={draftId}
			isEditorReady={editor.isEditorReady}
			isSaveReady={isActionReady && editor.isDirty}
			isPublishReady={isActionReady}
			prepareDocument={editor.prepareDocument}
			onSave={
				updateDraft === undefined
					? undefined
					: async (document) => {
							await updateDraft(draftId, document);
							editor.markClean();
						}
			}
			onPublish={editor.openPublishSettings}
		/>
	);
}
