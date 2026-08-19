import type { CologCreateValue, CologProfileValidationErrors } from '../model/colog-create';

import {
	COLOG_DESCRIPTION_MAX_LENGTH,
	COLOG_NAME_MAX_LENGTH,
	COLOG_NAME_MIN_LENGTH,
	COLOG_SLUG_MAX_LENGTH,
	COLOG_SLUG_MIN_LENGTH,
	COLOG_SLUG_PATTERN,
} from '@/domains/blog/model/colog';

const URL_PATTERN = /^https?:\/\//i;

export const normalizeCologCreateValue = (value: CologCreateValue): CologCreateValue => ({
	...value,
	name: value.name.trim(),
	slug: value.slug.trim().toLowerCase(),
	description: (value.description ?? '').trim(),
	profileImageUrl: (value.profileImageUrl ?? '').trim(),
	coverImageUrl: (value.coverImageUrl ?? '').trim(),
	serviceUrl: (value.serviceUrl ?? '').trim(),
	githubUrl: (value.githubUrl ?? '').trim(),
});

export const validateCologCreateValue = (value: CologCreateValue): CologProfileValidationErrors => {
	const errors: CologProfileValidationErrors = {};
	const normalized = normalizeCologCreateValue(value);

	const hasLogo =
		(value.logoFile !== null && value.logoFile !== undefined) || (normalized.profileImageUrl ?? '') !== '';
	if (!hasLogo) {
		errors.logoFile = '팀 로고를 등록해 주세요.';
	}

	if (normalized.name.length < COLOG_NAME_MIN_LENGTH || normalized.name.length > COLOG_NAME_MAX_LENGTH) {
		errors.name = `팀 이름은 ${COLOG_NAME_MIN_LENGTH}~${COLOG_NAME_MAX_LENGTH}자로 입력해 주세요.`;
	}

	if (
		normalized.slug.length < COLOG_SLUG_MIN_LENGTH ||
		normalized.slug.length > COLOG_SLUG_MAX_LENGTH ||
		!COLOG_SLUG_PATTERN.test(normalized.slug)
	) {
		errors.slug = `고유 아이디는 ${COLOG_SLUG_MIN_LENGTH}~${COLOG_SLUG_MAX_LENGTH}자의 영문 소문자, 숫자와 하이픈(-)만 사용할 수 있어요.`;
	}

	const description = normalized.description ?? '';
	if (description.length > COLOG_DESCRIPTION_MAX_LENGTH) {
		errors.description = `팀 소개는 ${COLOG_DESCRIPTION_MAX_LENGTH}자 이내로 입력해 주세요.`;
	}

	const serviceUrl = normalized.serviceUrl ?? '';
	if (serviceUrl.length > 0 && !URL_PATTERN.test(serviceUrl)) {
		errors.serviceUrl = '올바른 서비스 URL을 입력해 주세요.';
	}

	const githubUrl = normalized.githubUrl ?? '';
	if (githubUrl.length > 0 && !URL_PATTERN.test(githubUrl)) {
		errors.githubUrl = '올바른 GitHub URL을 입력해 주세요.';
	}

	return errors;
};
