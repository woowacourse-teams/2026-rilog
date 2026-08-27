'use client';

import { mapDraftDetailToEditorDocument } from '@/features/post-write/lib/map-draft-detail-to-editor-document';
import type { EditorDocument } from '@/features/post-write/model/post-publication';
import { useDraftDetailQuery } from '@/shared/api/drafts/queries/draft-detail/use-query';

interface UseDraftInitialDocumentOptions {
	draftId: number;
	isEnabled: boolean;
}

export const useDraftInitialDocument = ({ draftId, isEnabled }: UseDraftInitialDocumentOptions) =>
	useDraftDetailQuery({
		draftId,
		isEnabled,
		select: (response): EditorDocument | undefined =>
			response.data === undefined ? undefined : mapDraftDetailToEditorDocument(response.data),
	});
