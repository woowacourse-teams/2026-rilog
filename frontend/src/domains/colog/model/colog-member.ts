export type CologMemberPermission = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface CologMember {
	id: number;
	userId: number;
	nickname: string;
	slug: string;
	profileImageUrl: string;
	permission: CologMemberPermission;
	blogRole: string;
	joinedAt: string;
}
