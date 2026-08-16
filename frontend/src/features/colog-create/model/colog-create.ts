import type { CologProfile } from '@/domains/colog/model/colog-info';
import type { CologProfileValidationErrors } from '@/domains/colog/model/colog-profile-form';
import { normalizeCologProfileForm, validateCologProfileForm } from '@/domains/colog/model/colog-profile-form';

export interface CologCreateValue extends CologProfile {
	logoFile: File | null;
	coverImageFile: File | null;
}

export interface CologCreateValidationErrors extends CologProfileValidationErrors {
	logoFile?: string;
}

export interface CologCreateResult {
	slug: string;
}

export type CreateColog = (value: CologCreateValue) => Promise<CologCreateResult>;

export const INITIAL_COLOG_CREATE_VALUE: CologCreateValue = {
	name: '',
	slug: '',
	introduction: '',
	logoImageUrl: '/images/profile-placeholder.svg',
	coverImageUrl: '/images/team-cover-placeholder.svg',
	serviceUrl: '',
	githubUrl: '',
	email: '',
	logoFile: null,
	coverImageFile: null,
};

export const normalizeCologCreateValue = (value: CologCreateValue): CologCreateValue =>
	normalizeCologProfileForm(value);

export const validateCologCreateValue = (value: CologCreateValue): CologCreateValidationErrors => {
	const errors: CologCreateValidationErrors = validateCologProfileForm(value);

	if (value.logoFile === null) {
		errors.logoFile = '팀 로고를 등록해 주세요.';
	}

	if (value.introduction.trim() === '') {
		errors.introduction = '팀 소개를 입력해 주세요.';
	}

	return errors;
};
