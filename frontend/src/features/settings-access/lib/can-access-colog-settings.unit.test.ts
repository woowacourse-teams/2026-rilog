import { describe, expect, it } from 'vitest';

import type { BlogMemberResponse } from '@/shared/api/cologs/types';

import { canAccessCologSettings } from './can-access-colog-settings';

const createMember = (userId: number, permission: BlogMemberResponse['permission']): BlogMemberResponse => ({
	id: userId + 100,
	userId,
	nickname: `멤버 ${userId}`,
	slug: `member-${userId}`,
	profileImageUrl: null,
	permission,
	blogRole: '',
	joinedAt: '2026-08-20T00:00:00',
});

describe('canAccessCologSettings', () => {
	it.each(['OWNER', 'ADMIN'] as const)('%s 권한의 소속 멤버에게 설정 접근을 허용한다', (permission) => {
		expect(canAccessCologSettings(1, [createMember(1, permission)])).toBe(true);
	});

	it('MEMBER 권한의 소속 멤버에게 설정 접근을 허용하지 않는다', () => {
		expect(canAccessCologSettings(1, [createMember(1, 'MEMBER')])).toBe(false);
	});

	it('현재 사용자와 일치하는 멤버가 없으면 설정 접근을 허용하지 않는다', () => {
		expect(canAccessCologSettings(1, [createMember(2, 'OWNER')])).toBe(false);
		expect(canAccessCologSettings(1, [])).toBe(false);
	});
});
