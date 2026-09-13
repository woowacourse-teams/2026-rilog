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

const INVITED_MEMBER: CologMember = {
	...MEMBER,
	id: 8,
	nickname: '새 멤버',
	slug: 'new-member',
};

describe('useCologMemberDrafts', () => {
	it('요청받은 경우 초대 모달을 열린 상태로 초기화한다', () => {
		const { result } = renderHook(() => useCologMemberDrafts({ isInviteModalInitiallyOpen: true }));

		expect(result.current.isInviteModalOpen).toBe(true);
	});

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

	it('query cache에서 갱신된 멤버 목록을 현재 목록에 반영한다', () => {
		const initialMemberList = [MEMBER];
		const { result, rerender } = renderHook(
			({ initialMembers }: HookProps) => useCologMemberDrafts({ initialMembers }),
			{ initialProps: { initialMembers: initialMemberList } },
		);

		rerender({ initialMembers: [MEMBER, INVITED_MEMBER] });

		expect(result.current.members).toEqual([MEMBER, INVITED_MEMBER]);
	});

	it('query cache에서 제거된 멤버의 수정안은 현재 상태에서 제외한다', () => {
		const { result, rerender } = renderHook(
			({ initialMembers }: HookProps) => useCologMemberDrafts({ initialMembers }),
			{ initialProps: { initialMembers: [MEMBER] } },
		);

		act(() => {
			result.current.handlePermissionChange(MEMBER.id, 'ADMIN');
		});
		rerender({ initialMembers: [] });

		expect(result.current.members).toEqual([]);
		expect(result.current.draftMembers).toEqual([]);
		expect(result.current.isDirty).toBe(false);
	});
});
