import type { SignUpFieldValues, SignUpValidationErrors } from '../model/sign-up';

import {
	SIGN_UP_NICKNAME_MAX_LENGTH,
	SIGN_UP_NICKNAME_MIN_LENGTH,
	SIGN_UP_SLUG_MAX_LENGTH,
	SIGN_UP_SLUG_MIN_LENGTH,
	SIGN_UP_SLUG_PATTERN,
} from '../model/sign-up';

const SLUG_PATTERN = new RegExp(`^(?:${SIGN_UP_SLUG_PATTERN})$`);

export const normalizeSignUpFields = ({ nickname, slug }: SignUpFieldValues): SignUpFieldValues => ({
	nickname: nickname.trim(),
	slug: slug.trim(),
});

export const validateSignUpNickname = (nickname: string): string | undefined => {
	const normalizedNickname = nickname.trim();

	if (
		normalizedNickname.length < SIGN_UP_NICKNAME_MIN_LENGTH ||
		normalizedNickname.length > SIGN_UP_NICKNAME_MAX_LENGTH
	) {
		return `닉네임은 ${SIGN_UP_NICKNAME_MIN_LENGTH}~${SIGN_UP_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`;
	}

	return undefined;
};

export const validateSignUpSlug = (slug: string): string | undefined => {
	const normalizedSlug = slug.trim();

	if (
		normalizedSlug.length < SIGN_UP_SLUG_MIN_LENGTH ||
		normalizedSlug.length > SIGN_UP_SLUG_MAX_LENGTH ||
		!SLUG_PATTERN.test(normalizedSlug)
	) {
		return '고유 아이디는 4~20자의 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용할 수 있어요.';
	}

	return undefined;
};

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
