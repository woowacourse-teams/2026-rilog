import type { CologProfile } from '@/domains/colog/model/colog-info';
import type { CologProfileValidationErrors } from '@/domains/colog/model/colog-profile-form';
import {
	isCologProfileFormsEqual,
	normalizeCologProfileForm,
	validateCologProfileForm,
} from '@/domains/colog/model/colog-profile-form';

export type { CologProfileValidationErrors } from '@/domains/colog/model/colog-profile-form';
export {
	COLOG_PROFILE_INTRODUCTION_MAX_LENGTH,
	COLOG_PROFILE_NAME_MAX_LENGTH,
	COLOG_PROFILE_NAME_MIN_LENGTH,
	COLOG_PROFILE_SLUG_MAX_LENGTH,
	COLOG_PROFILE_SLUG_MIN_LENGTH,
	COLOG_PROFILE_SLUG_PATTERN,
} from '@/domains/colog/model/colog-profile-form';

export interface CologProfileSettingsValue extends CologProfile {
	logoFile: File | null;
	coverImageFile: File | null;
}

export const normalizeCologProfileSettings = (value: CologProfileSettingsValue): CologProfileSettingsValue =>
	normalizeCologProfileForm(value);

export const validateCologProfileSettings = (value: CologProfileSettingsValue): CologProfileValidationErrors =>
	validateCologProfileForm(value);

export const isCologProfileSettingsEqual = (left: CologProfileSettingsValue, right: CologProfileSettingsValue) =>
	isCologProfileFormsEqual(left, right);
