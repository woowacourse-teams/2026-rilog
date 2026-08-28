import type { RilogProfileSettingsValue } from '../model/rilog-profile-settings';

import type { BlogProfileUpdateRequest } from '@/shared/api/blogs/types';

const toNullableString = (value: string | undefined) => value || null;

export const mapRilogProfileUpdateRequest = (
	value: RilogProfileSettingsValue,
	profileImageUrl: string,
): BlogProfileUpdateRequest => ({
	name: value.nickname,
	profileImageUrl: toNullableString(profileImageUrl),
	coverImageUrl: null,
	introduction: toNullableString(value.description),
	serviceUrl: toNullableString(value.serviceUrl),
	githubUrl: toNullableString(value.githubUrl),
});
