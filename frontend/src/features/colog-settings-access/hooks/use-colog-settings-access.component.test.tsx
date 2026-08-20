import { renderHook, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCologSettingsAccess } from './use-colog-settings-access';

const { useAuthMock, useCologMembersQueryMock, useMyInfoQueryMock } = vi.hoisted(() => ({
	useAuthMock: vi.fn(),
	useCologMembersQueryMock: vi.fn(),
	useMyInfoQueryMock: vi.fn(),
}));

vi.mock('@/features/auth/model/use-auth', () => ({
	useAuth: useAuthMock,
}));

vi.mock('@/shared/api/cologs/queries/members/use-query', () => ({
	useCologMembersQuery: useCologMembersQueryMock,
}));

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: useMyInfoQueryMock,
}));

const createMemberResponse = (permission: 'OWNER' | 'ADMIN' | 'MEMBER') => ({
	status: 200,
	message: 'ok',
	data: [
		{
			id: 10,
			userId: 1,
			nickname: '리로그',
			slug: 'rilog-member',
			profileImageUrl: null,
			permission,
			blogRole: '',
			joinedAt: '2026-08-20T00:00:00',
		},
	],
});

describe('useCologSettingsAccess', () => {
	beforeEach(() => {
		useAuthMock.mockReturnValue({ isAuthenticated: true, isInitialized: true });
		useMyInfoQueryMock.mockReturnValue({
			data: { status: 200, message: 'ok', data: { id: 1 } },
			isError: false,
			isPending: false,
		});
		useCologMembersQueryMock.mockReturnValue({
			data: createMemberResponse('OWNER'),
			isError: false,
			isPending: false,
		});
	});

	it('server render에서는 권한 판정 전 상태를 반환한다', () => {
		useAuthMock.mockReturnValue({ isAuthenticated: false, isInitialized: false });

		function StatusProbe() {
			return useCologSettingsAccess('rilog');
		}

		expect(renderToString(<StatusProbe />)).toContain('initializing');
	});

	it('인증된 OWNER와 ADMIN에게 접근을 허용한다', async () => {
		const { result, rerender } = renderHook(() => useCologSettingsAccess('rilog'));

		await waitFor(() => expect(result.current).toBe('authorized'));

		useCologMembersQueryMock.mockReturnValue({
			data: createMemberResponse('ADMIN'),
			isError: false,
			isPending: false,
		});
		rerender();

		expect(result.current).toBe('authorized');
	});

	it('guest와 MEMBER에게 접근을 허용하지 않는다', async () => {
		useAuthMock.mockReturnValue({ isAuthenticated: false, isInitialized: true });
		const { result, rerender } = renderHook(() => useCologSettingsAccess('rilog'));

		await waitFor(() => expect(result.current).toBe('unauthorized'));

		useAuthMock.mockReturnValue({ isAuthenticated: true, isInitialized: true });
		useCologMembersQueryMock.mockReturnValue({
			data: createMemberResponse('MEMBER'),
			isError: false,
			isPending: false,
		});
		rerender();

		expect(result.current).toBe('unauthorized');
	});

	it('사용자 또는 멤버 정보를 조회하는 동안 checking 상태를 반환한다', async () => {
		useMyInfoQueryMock.mockReturnValue({ isError: false, isPending: true });
		const { result } = renderHook(() => useCologSettingsAccess('rilog'));

		await waitFor(() => expect(result.current).toBe('checking'));
	});

	it('권한 판별 요청이 실패하거나 응답 데이터가 없으면 error 상태를 반환한다', async () => {
		useCologMembersQueryMock.mockReturnValue({ isError: true, isPending: false });
		const { result, rerender } = renderHook(() => useCologSettingsAccess('rilog'));

		await waitFor(() => expect(result.current).toBe('error'));

		useCologMembersQueryMock.mockReturnValue({
			data: { status: 200, message: 'ok' },
			isError: false,
			isPending: false,
		});
		rerender();

		expect(result.current).toBe('error');
	});
});
