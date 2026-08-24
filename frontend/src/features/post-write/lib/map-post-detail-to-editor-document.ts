import type { Block } from '@blocknote/core';

import type { EditorDocument } from '@/features/post-write/model/post-publication';
import type { PostDetailResponse } from '@/shared/api/posts/types';

export const mapPostDetailToEditorDocument = (response: PostDetailResponse): EditorDocument => ({
	title: response.title,
	blocks: (Array.isArray(response.content) ? response.content : []) as Block[],
});
