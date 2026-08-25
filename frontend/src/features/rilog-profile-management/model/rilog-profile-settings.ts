import type { RefObject } from 'react';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';

export const RILOG_DESCRIPTION_MAX_LENGTH = 80;

export interface RilogProfileSettingsValue extends Pick<
	BlogPublicProfile,
	'slug' | 'description' | 'profileImageUrl' | 'serviceUrl' | 'githubUrl'
> {
	nickname: string;
	profileImageFile: File | null;
}

export type RilogProfileTextField = 'nickname' | 'description' | 'serviceUrl' | 'githubUrl';
export type RilogProfileValidationErrors = Partial<Record<RilogProfileTextField, string>>;

export interface RilogProfileFormRefs {
	profileImageFile: RefObject<HTMLInputElement | null>;
	nickname: RefObject<HTMLInputElement | null>;
	slug: RefObject<HTMLInputElement | null>;
	description: RefObject<HTMLTextAreaElement | null>;
	serviceUrl: RefObject<HTMLInputElement | null>;
	githubUrl: RefObject<HTMLInputElement | null>;
}
