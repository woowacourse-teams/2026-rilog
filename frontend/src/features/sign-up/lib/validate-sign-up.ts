import type { SignUpFieldValues, SignUpValidationErrors } from '../model/sign-up';

import {
	SIGN_UP_NICKNAME_MAX_LENGTH,
	SIGN_UP_NICKNAME_MIN_LENGTH,
	SIGN_UP_SLUG_MAX_LENGTH,
	SIGN_UP_SLUG_MIN_LENGTH,
	SIGN_UP_SLUG_PATTERN,
} from '../model/sign-up';

const SLUG_PATTERN = new RegExp(`^(?:${SIGN_UP_SLUG_PATTERN})$`);

export function validateSignUpFields({ nickname, slug }: SignUpFieldValues): SignUpValidationErrors {
	const errors: SignUpValidationErrors = {};
	const normalizedNickname = nickname.trim();
	const normalizedSlug = slug.trim();

	if (
		normalizedNickname.length < SIGN_UP_NICKNAME_MIN_LENGTH ||
		normalizedNickname.length > SIGN_UP_NICKNAME_MAX_LENGTH
	) {
		errors.nickname = `닉네임은 ${SIGN_UP_NICKNAME_MIN_LENGTH}~${SIGN_UP_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`;
	}

	if (
		normalizedSlug.length < SIGN_UP_SLUG_MIN_LENGTH ||
		normalizedSlug.length > SIGN_UP_SLUG_MAX_LENGTH ||
		!SLUG_PATTERN.test(normalizedSlug)
	) {
		errors.slug = '고유 아이디는 4~20자의 영문, 숫자, 하이픈(-), 언더스코어(_)만 사용할 수 있어요.';
	}

	return errors;
}
