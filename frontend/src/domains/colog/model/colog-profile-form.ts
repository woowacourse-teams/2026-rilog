import type { CologProfile } from './colog-info';

export interface CologProfileFormValue extends CologProfile {
	logoFile: File | null;
	coverImageFile: File | null;
}

export interface CologProfileValidationErrors {
	name?: string;
	slug?: string;
	introduction?: string;
	serviceUrl?: string;
	githubUrl?: string;
	email?: string;
}

export const COLOG_PROFILE_NAME_MIN_LENGTH = 2;
export const COLOG_PROFILE_NAME_MAX_LENGTH = 20;
export const COLOG_PROFILE_SLUG_MIN_LENGTH = 4;
export const COLOG_PROFILE_SLUG_MAX_LENGTH = 20;
export const COLOG_PROFILE_INTRODUCTION_MAX_LENGTH = 80;
export const COLOG_PROFILE_SLUG_PATTERN = '[a-z0-9-]+';

const SLUG_PATTERN = new RegExp(`^(?:${COLOG_PROFILE_SLUG_PATTERN})$`);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isEmptyOrValidHttpUrl = (value: string) => {
	if (value === '') {
		return true;
	}

	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
};

export const normalizeCologProfileForm = <TValue extends CologProfileFormValue>(value: TValue): TValue => ({
	...value,
	name: value.name.trim(),
	slug: value.slug.trim(),
	serviceUrl: value.serviceUrl.trim(),
	githubUrl: value.githubUrl.trim(),
	email: value.email.trim(),
});

export const validateCologProfileForm = (value: CologProfileFormValue): CologProfileValidationErrors => {
	const errors: CologProfileValidationErrors = {};
	const normalizedName = value.name.trim();
	const normalizedSlug = value.slug.trim();

	if (normalizedName.length < COLOG_PROFILE_NAME_MIN_LENGTH || normalizedName.length > COLOG_PROFILE_NAME_MAX_LENGTH) {
		errors.name = `팀 이름은 ${COLOG_PROFILE_NAME_MIN_LENGTH}~${COLOG_PROFILE_NAME_MAX_LENGTH}자로 입력해 주세요.`;
	}

	if (
		normalizedSlug.length < COLOG_PROFILE_SLUG_MIN_LENGTH ||
		normalizedSlug.length > COLOG_PROFILE_SLUG_MAX_LENGTH ||
		!SLUG_PATTERN.test(normalizedSlug)
	) {
		errors.slug = `고유 아이디는 ${COLOG_PROFILE_SLUG_MIN_LENGTH}~${COLOG_PROFILE_SLUG_MAX_LENGTH}자의 영문 소문자, 숫자와 하이픈(-)만 사용할 수 있어요.`;
	}

	if (value.introduction.length > COLOG_PROFILE_INTRODUCTION_MAX_LENGTH) {
		errors.introduction = `팀 소개는 ${COLOG_PROFILE_INTRODUCTION_MAX_LENGTH}자 이내로 입력해 주세요.`;
	}

	if (!isEmptyOrValidHttpUrl(value.serviceUrl.trim())) {
		errors.serviceUrl = '올바른 서비스 URL을 입력해 주세요.';
	}

	if (!isEmptyOrValidHttpUrl(value.githubUrl.trim())) {
		errors.githubUrl = '올바른 GitHub URL을 입력해 주세요.';
	}

	if (value.email.trim() !== '' && !EMAIL_PATTERN.test(value.email.trim())) {
		errors.email = '올바른 이메일 주소를 입력해 주세요.';
	}

	return errors;
};

export const areCologProfileFormsEqual = (left: CologProfileFormValue, right: CologProfileFormValue) =>
	left.name === right.name &&
	left.slug === right.slug &&
	left.introduction === right.introduction &&
	left.logoImageUrl === right.logoImageUrl &&
	left.coverImageUrl === right.coverImageUrl &&
	left.serviceUrl === right.serviceUrl &&
	left.githubUrl === right.githubUrl &&
	left.email === right.email &&
	left.logoFile === right.logoFile &&
	left.coverImageFile === right.coverImageFile;
