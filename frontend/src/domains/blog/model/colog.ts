import type { CologBlog } from './blog';

export const COLOG_NAME_MIN_LENGTH = 2;
export const COLOG_NAME_MAX_LENGTH = 20;
export const COLOG_SLUG_MIN_LENGTH = 4;
export const COLOG_SLUG_MAX_LENGTH = 20;
export const COLOG_DESCRIPTION_MAX_LENGTH = 80;
export const COLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CologMemberPermission = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface CologMember {
	id: number;
	nickname: string;
	slug: string;
	profileImageUrl: string | null;
	permission: CologMemberPermission;
	blogRole: string;
	joinedAt: string;
}

export type CologMemberSummary = Pick<CologMember, 'id' | 'slug' | 'nickname' | 'profileImageUrl'>;

export type CologSummary = Pick<
	CologBlog,
	'id' | 'slug' | 'name' | 'description' | 'profileImageUrl' | 'memberCount' | 'postCount'
>;

export type CologOption = Pick<CologBlog, 'id' | 'slug' | 'name'>;

export type CologProfile = Pick<
	CologBlog,
	'name' | 'slug' | 'description' | 'profileImageUrl' | 'coverImageUrl' | 'serviceUrl' | 'githubUrl'
>;
