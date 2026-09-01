import type { User } from '@/domains/user/model/user';
import type { ChapterResponse } from '@/shared/api/blogs/types';

export interface MyCologOverviewResponse {
	cologId: number;
	slug: string;
	name: string;
	profileImageUrl: string;
	chapters: ChapterResponse[];
}

export interface MyInfoResponse {
	id: number;
	slug: string;
	nickname: string;
	profileImageUrl: string | null;
}

export interface ReadUserBySlugRequest {
	slug: string;
}

export type ReadUserBySlugResponse = User;

export interface OnboardingRequest {
	nickname: string;
	slug: string;
	introduction?: string;
	profileImageUrl?: string;
	serviceUrl?: string;
	githubUrl?: string;
	email?: string;
}
