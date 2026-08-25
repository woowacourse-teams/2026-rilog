import type { CologMember } from './colog';

import type { PostSummary } from '@/domains/post/model/post';
import type { User } from '@/domains/user/model/user';

export type BlogType = 'RILOG' | 'COLOG';

export interface BaseBlog {
	id: number;
	slug: string;
	name: string;
	profileImageUrl: string | null;
	description?: string;
	type: BlogType;
}

export interface BlogPublicProfile extends BaseBlog {
	coverImageUrl: string | null;
	serviceUrl?: string;
	githubUrl?: string;
	memberCount: number;
	postCount: number;
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
