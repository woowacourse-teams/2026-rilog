import type { User } from '@/domains/user/model/user';

export type MemberInviteCandidate = Pick<User, 'slug' | 'nickname' | 'profileImageUrl'> & { userId: number };

export interface MemberInviteFailure {
	candidate: MemberInviteCandidate;
	message: string;
}

export interface MemberInviteResult {
	failures: MemberInviteFailure[];
}
