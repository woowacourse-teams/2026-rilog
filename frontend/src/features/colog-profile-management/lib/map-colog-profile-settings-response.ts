import type { CologProfileSettingsValue } from '../model/colog-profile-settings';

import type { CologPublicProfileResponse } from '@/shared/api/blogs/types';

export const mapCologProfileSettingsResponse = (response: CologPublicProfileResponse): CologProfileSettingsValue => ({
	name: response.name,
	slug: response.slug,
	description: response.introduction ?? '',
	profileImageUrl: response.profileImageUrl ?? '',
	coverImageUrl: response.coverImageUrl ?? '',
	serviceUrl: response.serviceUrl ?? '',
	githubUrl: response.githubUrl ?? '',
	logoFile: null,
	coverImageFile: null,
});
