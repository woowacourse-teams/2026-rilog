import { cache } from 'react';

import type { PostDetail } from '@/domains/post/model/post';
import { readPostDetail } from '@/shared/api/posts/api';

import { mapPostDetailResponse } from './map-post-detail-response';

export const getPublicPostDetail = cache(async (postId: number): Promise<PostDetail | null> => {
	try {
		const response = await readPostDetail({ postId });
		return response.data === undefined ? null : mapPostDetailResponse(response.data, postId);
	} catch {
		return null;
	}
});
