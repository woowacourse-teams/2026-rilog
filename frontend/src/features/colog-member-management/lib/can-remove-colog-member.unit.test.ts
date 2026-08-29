import { describe, expect, it } from 'vitest';

import type { CologMember, CologMemberPermission } from '@/domains/blog/model/colog';

import { canRemoveCologMember } from './can-remove-colog-member';

const createMember = (slug: string, permission: CologMemberPermission): CologMember => ({
	id: slug.length,
	nickname: slug,
	slug,
	profileImageUrl: null,
	permission,
	blogRole: '',
	joinedAt: '2026-08-20T10:00:00Z',
});

describe('canRemoveCologMember', () => {
	const currentMember = createMember('current-user', 'ADMIN');

	it('slug로 찾은 현재 사용자와 대상 멤버의 권한이 같으면 내보낼 수 없다', () => {
		const targetMember = createMember('another-admin', 'ADMIN');

		expect(canRemoveCologMember('@current-user', [currentMember, targetMember], targetMember)).toBe(false);
	});

	it('현재 사용자보다 권한이 낮은 멤버는 내보낼 수 있다', () => {
		const targetMember = createMember('member', 'MEMBER');

		expect(canRemoveCologMember('current-user', [currentMember, targetMember], targetMember)).toBe(true);
	});

	it('현재 사용자보다 권한이 높은 멤버는 내보낼 수 없다', () => {
		const targetMember = createMember('owner', 'OWNER');

		expect(canRemoveCologMember('current-user', [currentMember, targetMember], targetMember)).toBe(false);
	});

	it('OWNER는 자신보다 권한이 낮은 ADMIN을 내보낼 수 있다', () => {
		const owner = createMember('owner', 'OWNER');
		const targetMember = createMember('admin', 'ADMIN');

		expect(canRemoveCologMember('owner', [owner, targetMember], targetMember)).toBe(true);
	});

	it('현재 사용자를 멤버 목록에서 찾지 못하면 내보낼 수 없다', () => {
		const targetMember = createMember('member', 'MEMBER');

		expect(canRemoveCologMember('unknown', [currentMember, targetMember], targetMember)).toBe(false);
	});
});
