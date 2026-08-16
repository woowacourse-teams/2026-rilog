import type { CologProfile } from '@/domains/colog/model/colog-info';

export interface CologHomePost {
	id: number;
	title: string;
	publishedAt: string;
	author: {
		nickname: string;
		profileImageUrl: string | null;
	};
}

export interface CologHomeMember {
	id: number;
	nickname: string;
	profileImageUrl: string | null;
}

export interface CologHomeData {
	profile: CologProfile;
	posts: readonly CologHomePost[];
	members: readonly CologHomeMember[];
}
