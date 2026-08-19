export interface SignUpValue {
	nickname: string;
	slug: string;
	description: string;
	profileImageFile: File | null;
}

export interface SignUpResult {
	slug: string;
}

export type CompleteSignUp = (value: SignUpValue) => Promise<SignUpResult>;

export const SIGN_UP_NICKNAME_MIN_LENGTH = 2;
export const SIGN_UP_NICKNAME_MAX_LENGTH = 20;
export const SIGN_UP_SLUG_MIN_LENGTH = 4;
export const SIGN_UP_SLUG_MAX_LENGTH = 20;
export const SIGN_UP_DESCRIPTION_MAX_LENGTH = 80;
export const SIGN_UP_SLUG_PATTERN = '[A-Za-z0-9_-]+';

export interface SignUpFieldValues {
	nickname: string;
	slug: string;
}

export interface SignUpValidationErrors {
	nickname?: string;
	slug?: string;
}
