'use client';

import { mapPostDetailToEditorDocument } from '@/features/post-write/lib/map-post-detail-to-editor-document';
import { usePostDetailQuery } from '@/shared/api/posts/queries/post-detail/use-query';

interface UsePostWriteInitialDocumentOptions {
	postId: number;
	isEnabled: boolean;
}

export const usePostWriteInitialDocument = ({ postId, isEnabled }: UsePostWriteInitialDocumentOptions) =>
	usePostDetailQuery({
		postId,
		isEnabled,
		select: (response) => (response.data === undefined ? undefined : mapPostDetailToEditorDocument(response.data)),
	});
