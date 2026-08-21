import type { CologProfileSettingsValue } from '../model/colog-profile-settings';

import type { CologProfileUpdateRequest } from '@/shared/api/cologs/types';

interface CologProfileImageUrls {
	profileImageUrl: string;
	coverImageUrl: string;
}

const toNullableString = (value: string | undefined) => value || null;

export const mapCologProfileUpdateRequest = (
	value: CologProfileSettingsValue,
	imageUrls: CologProfileImageUrls,
): CologProfileUpdateRequest => ({
	name: value.name,
	profileImageUrl: toNullableString(imageUrls.profileImageUrl),
	coverImageUrl: toNullableString(imageUrls.coverImageUrl),
	introduction: toNullableString(value.description),
	serviceUrl: toNullableString(value.serviceUrl),
	githubUrl: toNullableString(value.githubUrl),
});
