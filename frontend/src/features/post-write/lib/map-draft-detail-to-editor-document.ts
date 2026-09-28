import type { EditorDocument } from '@/features/post-write/model/post-publication';
import type { DraftDetailResponse } from '@/shared/api/drafts/types';

export const mapDraftDetailToEditorDocument = (response: DraftDetailResponse): EditorDocument => ({
	title: response.title,
	blocks: response.content,
});
