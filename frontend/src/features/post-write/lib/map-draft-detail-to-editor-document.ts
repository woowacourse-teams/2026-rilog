import type { Block } from '@blocknote/core';

import type { EditorDocument } from '@/features/post-write/model/post-publication';
import type { DraftDetailResponse } from '@/shared/api/drafts/types';

export const mapDraftDetailToEditorDocument = (response: DraftDetailResponse): EditorDocument => ({
	title: response.title,
	blocks: (Array.isArray(response.content) ? response.content : []) as Block[],
});
