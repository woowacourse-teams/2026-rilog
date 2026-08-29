import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CologMember } from '@/domains/blog/model/colog';

import { useCologMemberDrafts } from './use-colog-member-drafts';

interface HookProps {
	initialMembers?: CologMember[];
}

const MEMBER: CologMember = {
	id: 7,
	nickname: '리로그 멤버',
	slug: 'member',
	profileImageUrl: null,
	permission: 'MEMBER',
	blogRole: '',
	joinedAt: '2026-08-20T10:00:00Z',
};

describe('useCologMemberDrafts', () => {
	it('비동기로 도착한 최초 멤버 목록을 초기 상태에 반영한다', () => {
		const initialProps: HookProps = { initialMembers: undefined };
		const { result, rerender } = renderHook(
			({ initialMembers }: HookProps) => useCologMemberDrafts({ initialMembers }),
			{ initialProps },
		);

		expect(result.current.members).toEqual([]);

		rerender({ initialMembers: [MEMBER] });

		expect(result.current.members).toEqual([MEMBER]);
	});

	it('내보낸 멤버를 현재 목록과 수정안에서 제거한다', () => {
		const { result } = renderHook(() => useCologMemberDrafts({ initialMembers: [MEMBER] }));

		act(() => {
			result.current.handlePermissionChange(MEMBER.id, 'ADMIN');
			result.current.handleRemoveMember(MEMBER.id);
		});

		expect(result.current.members).toEqual([]);
		expect(result.current.draftMembers).toEqual([]);
	});
});
