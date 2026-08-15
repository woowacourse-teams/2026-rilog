import type { MemberInviteCandidate } from '../model/member-invite-candidate';

const MOCK_MEMBER_INVITE_CANDIDATES: MemberInviteCandidate[] = [
	{
		slug: 'jetproc',
		nickname: '김지연',
		profileImageUrl: '',
	},
	{
		slug: 'frontend',
		nickname: '이프론트',
		profileImageUrl: '',
	},
];

export function mockFindMemberInviteCandidate(slug: string): MemberInviteCandidate | null {
	return MOCK_MEMBER_INVITE_CANDIDATES.find((candidate) => candidate.slug === slug) ?? null;
}
