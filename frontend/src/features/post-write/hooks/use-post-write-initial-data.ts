'use client';

import { mapPostDetailToEditorDocument } from '@/features/post-write/lib/map-post-detail-to-editor-document';
import type { EditorDocument } from '@/features/post-write/model/post-publication';
import { usePostDetailQuery } from '@/shared/api/posts/queries/post-detail/use-query';

interface UsePostWriteInitialDataOptions {
	postId: number;
	isEnabled: boolean;
}

export interface PostWriteInitialData {
	authorId: number;
	document: EditorDocument;
}

export const usePostWriteInitialData = ({ postId, isEnabled }: UsePostWriteInitialDataOptions) =>
	usePostDetailQuery({
		postId,
		isEnabled,
		select: (response): PostWriteInitialData | undefined =>
			response.data === undefined
				? undefined
				: {
						authorId: response.data.author.userId,
						document: mapPostDetailToEditorDocument(response.data),
					},
	});
