export interface CologCreateRequest {
	name: string;
	slug: string;
	introduction?: string;
	profileImageUrl?: string;
	coverImageUrl?: string;
	serviceUrl?: string;
	githubUrl?: string;
}

export interface CologCreateResponse {
	id: number;
	name: string;
	slug: string;
}

export interface BlogMemberResponse {
	id: number;
	userId: number;
	nickname: string;
	slug: string;
	profileImageUrl: string | null;
	permission: 'OWNER' | 'ADMIN' | 'MEMBER';
	blogRole: string;
	joinedAt: string;
}
