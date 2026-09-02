import { cache } from 'react';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import { isNotFoundApiError } from '@/shared/api/api-error';
import { readBlogPublicProfile } from '@/shared/api/blogs/api';
import type { BlogPublicProfileResponse } from '@/shared/api/blogs/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { mapBlogPublicProfileResponse } from './map-blog-public-profile-response';

export interface BlogPublicProfileData {
	profile: BlogPublicProfile;
	response: ApiResponse<BlogPublicProfileResponse>;
}

export const getBlogPublicProfile = cache(async (slug: string): Promise<BlogPublicProfileData | null> => {
	try {
		const response = await readBlogPublicProfile({ slug });
		return response.data === undefined ? null : { profile: mapBlogPublicProfileResponse(response.data), response };
	} catch (error) {
		if (isNotFoundApiError(error)) return null;
		throw error;
	}
});
