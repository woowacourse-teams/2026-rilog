import type { MemberInviteFailure } from '../model/member-invite-candidate';

export const formatMemberInviteFailures = (failures: MemberInviteFailure[]): string => {
	const nicknamesByMessage = new Map<string, string[]>();

	for (const failure of failures) {
		const nicknames = nicknamesByMessage.get(failure.message) ?? [];
		nicknames.push(failure.candidate.nickname);
		nicknamesByMessage.set(failure.message, nicknames);
	}

	return Array.from(nicknamesByMessage, ([message, nicknames]) => `${message} (${nicknames.join(', ')})`).join('\n');
};
