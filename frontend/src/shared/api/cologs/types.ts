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

export interface CologProfileUpdateRequest {
	name: string;
	profileImageUrl: string | null;
	coverImageUrl: string | null;
	introduction: string | null;
	serviceUrl: string | null;
	githubUrl: string | null;
}

export interface CologMemberInviteRequest {
	userId: number;
	permission: 'ADMIN' | 'MEMBER';
	blogRole?: string;
}

export interface CologMemberInviteResponse {
	id: number;
	userId: number;
	permission: 'OWNER' | 'ADMIN' | 'MEMBER';
	blogRole: string;
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
