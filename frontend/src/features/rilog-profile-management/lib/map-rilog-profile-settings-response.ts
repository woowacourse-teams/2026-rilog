import type { RilogProfileSettingsValue } from '../model/rilog-profile-settings';

import type { BlogPublicProfileResponse } from '@/shared/api/blogs/types';

export const mapRilogProfileSettingsResponse = (response: BlogPublicProfileResponse): RilogProfileSettingsValue => ({
	nickname: response.name,
	slug: response.slug,
	description: response.introduction ?? '',
	profileImageUrl: response.profileImageUrl ?? '',
	serviceUrl: response.serviceUrl ?? '',
	githubUrl: response.githubUrl ?? '',
	profileImageFile: null,
});
