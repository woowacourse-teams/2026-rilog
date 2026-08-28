import type { SignUpFieldValues, SignUpValidationErrors } from '../model/sign-up';

import { BLOG_PROFILE_URL_MAX_LENGTH } from '@/domains/blog/model/blog';
import {
	normalizeUserNickname,
	normalizeUserSlug,
	validateUserNickname,
	validateUserSlug,
} from '@/domains/user/lib/validate-user-profile';
import { isHttpUrl } from '@/shared/utils/is-http-url';

export const normalizeSignUpFields = ({
	nickname,
	slug,
	serviceUrl,
	githubUrl,
}: SignUpFieldValues): SignUpFieldValues => ({
	nickname: normalizeUserNickname(nickname),
	slug: normalizeUserSlug(slug),
	serviceUrl: serviceUrl.trim(),
	githubUrl: githubUrl.trim(),
});

export const validateSignUpNickname = validateUserNickname;

export const validateSignUpSlug = validateUserSlug;

export function validateSignUpFields(value: SignUpFieldValues): SignUpValidationErrors {
	const errors: SignUpValidationErrors = {};
	const { nickname, slug, serviceUrl, githubUrl } = normalizeSignUpFields(value);
	const nicknameError = validateSignUpNickname(nickname);
	const slugError = validateSignUpSlug(slug);

	if (nicknameError !== undefined) {
		errors.nickname = nicknameError;
	}

	if (slugError !== undefined) {
		errors.slug = slugError;
	}

	if (serviceUrl.length > BLOG_PROFILE_URL_MAX_LENGTH) {
		errors.serviceUrl = `서비스 링크는 ${BLOG_PROFILE_URL_MAX_LENGTH}자 이하로 입력해 주세요.`;
	} else if (serviceUrl.length > 0 && !isHttpUrl(serviceUrl)) {
		errors.serviceUrl = '올바른 서비스 URL을 입력해 주세요.';
	}

	if (githubUrl.length > BLOG_PROFILE_URL_MAX_LENGTH) {
		errors.githubUrl = `GitHub 링크는 ${BLOG_PROFILE_URL_MAX_LENGTH}자 이하로 입력해 주세요.`;
	} else if (githubUrl.length > 0 && !isHttpUrl(githubUrl)) {
		errors.githubUrl = '올바른 GitHub URL을 입력해 주세요.';
	}

	return errors;
}
