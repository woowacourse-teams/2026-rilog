import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentCologPermission } from './use-current-colog-permission';

const { useAuthMock, useCologMembersQueryMock, useMyInfoQueryMock } = vi.hoisted(() => ({
	useAuthMock: vi.fn(),
	useCologMembersQueryMock: vi.fn(),
	useMyInfoQueryMock: vi.fn(),
}));

vi.mock('@/features/auth/model/use-auth', () => ({ useAuth: useAuthMock }));
vi.mock('@/shared/api/cologs/queries/members/use-query', () => ({
	useCologMembersQuery: useCologMembersQueryMock,
}));
vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({ useMyInfoQuery: useMyInfoQueryMock }));

describe('useCurrentCologPermission', () => {
	beforeEach(() => {
		useAuthMock.mockReturnValue({ isAuthenticated: true, isInitialized: true });
		useMyInfoQueryMock.mockReturnValue({ data: { data: { id: 7 } } });
		useCologMembersQueryMock.mockReturnValue({
			data: {
				data: [
					{ userId: 7, permission: 'ADMIN' },
					{ userId: 8, permission: 'MEMBER' },
				],
			},
		});
	});

	it('현재 사용자 id와 일치하는 팀 멤버 권한을 반환한다', () => {
		const { result } = renderHook(() => useCurrentCologPermission('rilog'));

		expect(result.current).toBe('ADMIN');
		expect(useCologMembersQueryMock).toHaveBeenCalledWith({ slug: 'rilog', isEnabled: true });
	});

	it('비로그인 사용자에게는 권한을 반환하지 않고 query를 비활성화한다', () => {
		useAuthMock.mockReturnValue({ isAuthenticated: false, isInitialized: true });
		const { result } = renderHook(() => useCurrentCologPermission('rilog'));

		expect(result.current).toBeUndefined();
		expect(useCologMembersQueryMock).toHaveBeenCalledWith({ slug: 'rilog', isEnabled: false });
	});

	it('팀 멤버가 아니면 권한을 반환하지 않는다', () => {
		useMyInfoQueryMock.mockReturnValue({ data: { data: { id: 99 } } });
		const { result } = renderHook(() => useCurrentCologPermission('rilog'));

		expect(result.current).toBeUndefined();
	});
});
