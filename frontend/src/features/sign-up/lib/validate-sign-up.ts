import type { SignUpFieldValues, SignUpValidationErrors } from '../model/sign-up';

import {
	normalizeUserNickname,
	normalizeUserSlug,
	validateUserNickname,
	validateUserSlug,
} from '@/domains/user/lib/validate-user-profile';

export const normalizeSignUpFields = ({ nickname, slug }: SignUpFieldValues): SignUpFieldValues => ({
	nickname: normalizeUserNickname(nickname),
	slug: normalizeUserSlug(slug),
});

export const validateSignUpNickname = validateUserNickname;

export const validateSignUpSlug = validateUserSlug;

export function validateSignUpFields({ nickname, slug }: SignUpFieldValues): SignUpValidationErrors {
	const errors: SignUpValidationErrors = {};
	const nicknameError = validateSignUpNickname(nickname);
	const slugError = validateSignUpSlug(slug);

	if (nicknameError !== undefined) {
		errors.nickname = nicknameError;
	}

	if (slugError !== undefined) {
		errors.slug = slugError;
	}

	return errors;
}
