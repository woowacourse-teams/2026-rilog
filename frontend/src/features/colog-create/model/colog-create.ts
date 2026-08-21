import type { CologProfile } from '@/domains/blog/model/colog';

export type CologProfileTextField = keyof Omit<CologProfile, 'profileImageUrl' | 'coverImageUrl'>;

export type CologProfileValidationErrors = Partial<Record<CologProfileTextField | 'logoFile', string>>;

export interface CologCreateValue extends CologProfile {
	logoFile: File | null;
	coverImageFile: File | null;
}

export interface CologCreateResult {
	slug: string;
}

export type CreateColog = (value: CologCreateValue) => Promise<CologCreateResult>;

export const INITIAL_COLOG_CREATE_VALUE: CologCreateValue = {
	name: '',
	slug: '',
	description: '',
	profileImageUrl: '',
	coverImageUrl: '',
	serviceUrl: '',
	githubUrl: '',
	logoFile: null,
	coverImageFile: null,
};
