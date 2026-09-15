import type { CologCreateValue, CologProfileValidationErrors } from '../model/colog-create';

import {
	COLOG_DESCRIPTION_MAX_LENGTH,
	COLOG_SLUG_MAX_LENGTH,
	COLOG_SLUG_MIN_LENGTH,
	COLOG_SLUG_PATTERN,
	normalizeCologName,
	validateCologName,
} from '@/domains/blog/model/colog';
import { isHttpUrl } from '@/shared/utils/is-http-url';

export const normalizeCologSlug = (slug: string): string => slug.trim().toLowerCase();

export const validateCologSlug = (slug: string): string | undefined => {
	const normalizedSlug = normalizeCologSlug(slug);

	if (
		normalizedSlug.length < COLOG_SLUG_MIN_LENGTH ||
		normalizedSlug.length > COLOG_SLUG_MAX_LENGTH ||
		!COLOG_SLUG_PATTERN.test(normalizedSlug)
	) {
		return `고유 아이디는 ${COLOG_SLUG_MIN_LENGTH}~${COLOG_SLUG_MAX_LENGTH}자의 영문 소문자, 숫자와 하이픈(-)만 사용할 수 있어요.`;
	}

	return undefined;
};

export const normalizeCologCreateValue = (value: CologCreateValue): CologCreateValue => ({
	...value,
	name: normalizeCologName(value.name),
	slug: normalizeCologSlug(value.slug),
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

	const nameError = validateCologName(normalized.name);
	if (nameError !== undefined) {
		errors.name = nameError;
	}

	const slugError = validateCologSlug(normalized.slug);
	if (slugError !== undefined) {
		errors.slug = slugError;
	}

	const description = normalized.description ?? '';
	if (description.length > COLOG_DESCRIPTION_MAX_LENGTH) {
		errors.description = `팀 소개는 ${COLOG_DESCRIPTION_MAX_LENGTH}자 이내로 입력해 주세요.`;
	}

	const serviceUrl = normalized.serviceUrl ?? '';
	if (serviceUrl.length > 0 && !isHttpUrl(serviceUrl)) {
		errors.serviceUrl = '올바른 서비스 URL을 입력해 주세요.';
	}

	const githubUrl = normalized.githubUrl ?? '';
	if (githubUrl.length > 0 && !isHttpUrl(githubUrl)) {
		errors.githubUrl = '올바른 GitHub URL을 입력해 주세요.';
	}

	return errors;
};
