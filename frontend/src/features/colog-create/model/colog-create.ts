import type { CologProfile } from '@/domains/colog/model/colog-info';
import type { CologProfileValidationErrors } from '@/domains/colog/model/colog-profile-form';
import {
	EMPTY_COLOG_PROFILE_FORM_VALUE,
	normalizeCologProfileForm,
	validateCologProfileForm,
} from '@/domains/colog/model/colog-profile-form';

export interface CologCreateValue extends CologProfile {
	logoFile: File | null;
	coverImageFile: File | null;
}

export interface CologCreateResult {
	slug: string;
}

export type CreateColog = (value: CologCreateValue) => Promise<CologCreateResult>;

export const INITIAL_COLOG_CREATE_VALUE: CologCreateValue = {
	...EMPTY_COLOG_PROFILE_FORM_VALUE,
};

export const normalizeCologCreateValue = (value: CologCreateValue): CologCreateValue =>
	normalizeCologProfileForm(value);

export const validateCologCreateValue = (value: CologCreateValue): CologProfileValidationErrors =>
	validateCologProfileForm(value);
