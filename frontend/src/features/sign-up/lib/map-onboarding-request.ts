import type { SignUpValue } from '../model/sign-up';

import type { OnboardingRequest } from '@/shared/api/users/types';

const optionalField = <TKey extends string>(key: TKey, value: string) => {
	const normalizedValue = value.trim();

	return normalizedValue === '' ? {} : { [key]: normalizedValue };
};

export const mapOnboardingRequest = (value: SignUpValue, profileImageUrl: string): OnboardingRequest => ({
	nickname: value.nickname.trim(),
	slug: value.slug.trim(),
	...optionalField('introduction', value.description),
	...optionalField('profileImageUrl', profileImageUrl),
	...optionalField('serviceUrl', value.serviceUrl),
	...optionalField('githubUrl', value.githubUrl),
});
