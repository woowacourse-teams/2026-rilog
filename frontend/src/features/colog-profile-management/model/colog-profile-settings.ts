import type { RefObject } from 'react';

import type { CologProfile } from '@/domains/blog/model/colog';

export type CologProfileTextField = keyof Omit<CologProfile, 'profileImageUrl' | 'coverImageUrl'>;

export type CologProfileValidationErrors = Partial<Record<CologProfileTextField | 'logoFile', string>>;

export interface CologProfileSettingsValue extends CologProfile {
	logoFile: File | null;
	coverImageFile: File | null;
}

export interface CologProfileFormRefs {
	logoFile: RefObject<HTMLInputElement | null>;
	name: RefObject<HTMLInputElement | null>;
	slug: RefObject<HTMLInputElement | null>;
	description: RefObject<HTMLTextAreaElement | null>;
	serviceUrl: RefObject<HTMLInputElement | null>;
	githubUrl: RefObject<HTMLInputElement | null>;
	email: RefObject<HTMLInputElement | null>;
}

export const EMPTY_COLOG_PROFILE_SETTINGS_VALUE: CologProfileSettingsValue = {
	name: '',
	slug: '',
	description: '',
	profileImageUrl: '',
	coverImageUrl: '',
	serviceUrl: '',
	githubUrl: '',
	email: '',
	logoFile: null,
	coverImageFile: null,
};
