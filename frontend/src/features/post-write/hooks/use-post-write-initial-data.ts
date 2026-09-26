'use client';

import { mapPostDetailToPostWriteInitialData } from '@/features/post-write/lib/map-post-detail-to-post-write-initial-data';
import type { PostWriteInitialData } from '@/features/post-write/model/post-publication';
import { usePostDetailQuery } from '@/shared/api/posts/queries/post-detail/use-query';

interface UsePostWriteInitialDataOptions {
	slug: string;
	postId: number;
	isEnabled: boolean;
}

export const usePostWriteInitialData = ({ slug, postId, isEnabled }: UsePostWriteInitialDataOptions) =>
	usePostDetailQuery({
		slug,
		postId,
		isEnabled,
		select: (response): PostWriteInitialData | undefined =>
			response.data === undefined ? undefined : mapPostDetailToPostWriteInitialData(response.data),
	});
