import type { CologMember } from './colog';

import type { PostSummary } from '@/domains/post/model/post';
import type { User } from '@/domains/user/model/user';

export interface BaseBlog {
	id: number;
	slug: string;
	name: string;
	profileImageUrl: string | null;
	description?: string;
	type: 'RILOG' | 'COLOG';
}

// 개인 블로그 (Rilog)
export interface RilogBlog extends BaseBlog {
	type: 'RILOG';
	owner: User;
}

// 팀 블로그 (Colog)
export interface CologBlog extends BaseBlog {
	type: 'COLOG';
	coverImageUrl: string | null;
	serviceUrl?: string;
	githubUrl?: string;
	members?: CologMember[];
	posts?: PostSummary[];
	memberCount?: number;
	postCount?: number;
}

export type Blog = RilogBlog | CologBlog;
