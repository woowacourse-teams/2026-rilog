import type { RilogProfileSettingsValue, RilogProfileValidationErrors } from '../model/rilog-profile-settings';

import { BLOG_PROFILE_URL_MAX_LENGTH } from '@/domains/blog/model/blog';
import { normalizeUserNickname, validateUserNickname } from '@/domains/user/lib/validate-user-profile';
import { isHttpUrl } from '@/shared/utils/is-http-url';

import { RILOG_DESCRIPTION_MAX_LENGTH } from '../model/rilog-profile-settings';

export const normalizeRilogProfileSettings = (value: RilogProfileSettingsValue): RilogProfileSettingsValue => ({
	...value,
	nickname: normalizeUserNickname(value.nickname),
	slug: value.slug.trim(),
	description: (value.description ?? '').trim(),
	profileImageUrl: (value.profileImageUrl ?? '').trim(),
	serviceUrl: (value.serviceUrl ?? '').trim(),
	githubUrl: (value.githubUrl ?? '').trim(),
});

export const validateRilogProfileSettings = (value: RilogProfileSettingsValue): RilogProfileValidationErrors => {
	const errors: RilogProfileValidationErrors = {};
	const normalized = normalizeRilogProfileSettings(value);

	const nicknameError = validateUserNickname(normalized.nickname);
	if (nicknameError !== undefined) {
		errors.nickname = nicknameError;
	}

	if ((normalized.description ?? '').length > RILOG_DESCRIPTION_MAX_LENGTH) {
		errors.description = `소개는 ${RILOG_DESCRIPTION_MAX_LENGTH}자 이내로 입력해 주세요.`;
	}

	const serviceUrl = normalized.serviceUrl ?? '';
	if (serviceUrl.length > BLOG_PROFILE_URL_MAX_LENGTH) {
		errors.serviceUrl = `서비스 링크는 ${BLOG_PROFILE_URL_MAX_LENGTH}자 이하로 입력해 주세요.`;
	} else if (serviceUrl.length > 0 && !isHttpUrl(serviceUrl)) {
		errors.serviceUrl = '올바른 서비스 URL을 입력해 주세요.';
	}

	const githubUrl = normalized.githubUrl ?? '';
	if (githubUrl.length > BLOG_PROFILE_URL_MAX_LENGTH) {
		errors.githubUrl = `GitHub 링크는 ${BLOG_PROFILE_URL_MAX_LENGTH}자 이하로 입력해 주세요.`;
	} else if (githubUrl.length > 0 && !isHttpUrl(githubUrl)) {
		errors.githubUrl = '올바른 GitHub URL을 입력해 주세요.';
	}

	return errors;
};

export const isRilogProfileSettingsEqual = (
	left: RilogProfileSettingsValue,
	right: RilogProfileSettingsValue,
): boolean =>
	left.nickname === right.nickname &&
	left.slug === right.slug &&
	(left.description ?? '') === (right.description ?? '') &&
	(left.profileImageUrl ?? '') === (right.profileImageUrl ?? '') &&
	(left.serviceUrl ?? '') === (right.serviceUrl ?? '') &&
	(left.githubUrl ?? '') === (right.githubUrl ?? '') &&
	left.profileImageFile === right.profileImageFile;
