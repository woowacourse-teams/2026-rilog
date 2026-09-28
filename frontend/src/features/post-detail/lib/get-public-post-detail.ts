import { cache } from 'react';

import type { PostDetail } from '@/domains/post/model/post';
import { isNormalizedApiError, isNotFoundApiError } from '@/shared/api/api-error';
import { API_ERROR_CODES } from '@/shared/api/error-codes';
import { readPostDetail } from '@/shared/api/posts/api';

import { mapPostDetailResponse } from './map-post-detail-response';

const isInvalidSlugApiError = (error: unknown): boolean =>
	isNormalizedApiError(error) &&
	error.type === 'api' &&
	error.response.status === 400 &&
	error.detail.errorCode === API_ERROR_CODES.INVALID_SLUG;

export const getPublicPostDetail = cache(async (slug: string, postId: number): Promise<PostDetail | null> => {
	try {
		const response = await readPostDetail({ slug, postId });
		return response.data === undefined ? null : mapPostDetailResponse(response.data, postId);
	} catch (error) {
		if (isNotFoundApiError(error) || isInvalidSlugApiError(error)) {
			return null;
		}
		throw error;
	}
});
