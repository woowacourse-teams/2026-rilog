import type { User } from '@/domains/user/model/user';

export type MemberInviteCandidate = Pick<User, 'slug' | 'nickname' | 'profileImageUrl'>;
