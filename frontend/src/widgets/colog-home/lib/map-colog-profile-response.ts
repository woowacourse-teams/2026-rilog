import type { CologProfile } from '@/domains/blog/model/colog';
import type { CologPublicProfileResponse } from '@/shared/api/blogs/types';

export const mapCologProfileResponse = (response: CologPublicProfileResponse): CologProfile => ({
	name: response.name,
	slug: response.slug,
	description: response.introduction ?? undefined,
	profileImageUrl: response.profileImageUrl,
	coverImageUrl: response.coverImageUrl,
	serviceUrl: response.serviceUrl ?? undefined,
	githubUrl: response.githubUrl ?? undefined,
});
