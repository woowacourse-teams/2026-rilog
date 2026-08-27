import {
	USER_NICKNAME_MAX_LENGTH,
	USER_NICKNAME_MIN_LENGTH,
	USER_SLUG_MAX_LENGTH,
	USER_SLUG_MIN_LENGTH,
	USER_SLUG_PATTERN,
} from '@/domains/user/lib/validate-user-profile';

export interface SignUpValue {
	nickname: string;
	slug: string;
	description: string;
	serviceUrl: string;
	githubUrl: string;
	profileImageFile: File | null;
}

export interface SignUpResult {
	slug: string;
}

export type CompleteSignUp = (value: SignUpValue) => Promise<SignUpResult>;

export const SIGN_UP_NICKNAME_MIN_LENGTH = USER_NICKNAME_MIN_LENGTH;
export const SIGN_UP_NICKNAME_MAX_LENGTH = USER_NICKNAME_MAX_LENGTH;
export const SIGN_UP_SLUG_MIN_LENGTH = USER_SLUG_MIN_LENGTH;
export const SIGN_UP_SLUG_MAX_LENGTH = USER_SLUG_MAX_LENGTH;
export const SIGN_UP_DESCRIPTION_MAX_LENGTH = 80;
export const SIGN_UP_SLUG_PATTERN = USER_SLUG_PATTERN;

export interface SignUpFieldValues {
	nickname: string;
	slug: string;
	serviceUrl: string;
	githubUrl: string;
}

export interface SignUpValidationErrors {
	nickname?: string;
	slug?: string;
	serviceUrl?: string;
	githubUrl?: string;
}
