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
