import { cache } from 'react';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import { readBlogPublicProfile } from '@/shared/api/blogs/api';

import { mapBlogPublicProfileResponse } from './map-blog-public-profile-response';

export const getBlogPublicProfile = cache(async (slug: string): Promise<BlogPublicProfile | null> => {
	try {
		const response = await readBlogPublicProfile({ slug });
		return response.data === undefined ? null : mapBlogPublicProfileResponse(response.data);
	} catch {
		return null;
	}
});
