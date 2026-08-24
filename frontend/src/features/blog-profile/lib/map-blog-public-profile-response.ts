import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import type { BlogPublicProfileResponse } from '@/shared/api/blogs/types';

export const mapBlogPublicProfileResponse = (response: BlogPublicProfileResponse): BlogPublicProfile => ({
	type: response.type,
	id: response.id,
	name: response.name,
	slug: response.slug,
	description: response.introduction ?? undefined,
	profileImageUrl: response.profileImageUrl,
	coverImageUrl: response.coverImageUrl,
	serviceUrl: response.serviceUrl ?? undefined,
	githubUrl: response.githubUrl ?? undefined,
	memberCount: response.memberCount,
	postCount: response.postCount,
});
