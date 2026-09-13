import { describe, expect, it } from 'vitest';

import type { MemberInviteFailure } from '../model/member-invite-candidate';

import { formatMemberInviteFailures } from './format-member-invite-failures';

const createFailure = (nickname: string, message: string, userId: number): MemberInviteFailure => ({
	candidate: {
		userId,
		slug: `member-${userId}`,
		nickname,
		profileImageUrl: null,
	},
	message,
});

describe('formatMemberInviteFailures', () => {
	it('같은 오류가 발생한 사용자를 하나의 메시지로 묶는다', () => {
		const failures = [
			createFailure('첫 번째 멤버', '멤버를 초대하지 못했어요.', 1),
			createFailure('두 번째 멤버', '멤버를 초대하지 못했어요.', 2),
		];

		expect(formatMemberInviteFailures(failures)).toBe('멤버를 초대하지 못했어요. (첫 번째 멤버, 두 번째 멤버)');
	});

	it('서로 다른 오류는 발생 순서대로 줄을 나누어 표시한다', () => {
		const failures = [
			createFailure('첫 번째 멤버', '사용자는 최대 10개의 Colog에 속할 수 있습니다.', 1),
			createFailure('두 번째 멤버', '멤버를 초대하지 못했어요.', 2),
			createFailure('세 번째 멤버', '사용자는 최대 10개의 Colog에 속할 수 있습니다.', 3),
		];

		expect(formatMemberInviteFailures(failures)).toBe(
			'사용자는 최대 10개의 Colog에 속할 수 있습니다. (첫 번째 멤버, 세 번째 멤버)\n멤버를 초대하지 못했어요. (두 번째 멤버)',
		);
	});
});
