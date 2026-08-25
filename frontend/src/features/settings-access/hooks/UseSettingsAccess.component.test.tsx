import { renderHook, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSettingsAccess } from './use-settings-access';

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

describe('useSettingsAccess', () => {
	beforeEach(() => {
		useAuthMock.mockReturnValue({ isAuthenticated: true, isInitialized: true });
		useMyInfoQueryMock.mockReturnValue({
			data: { status: 200, message: 'ok', data: { id: 1, slug: 'rilogger' } },
			isError: false,
			isPending: false,
		});
		useCologMembersQueryMock.mockReturnValue({
			data: createMemberResponse('OWNER'),
			isError: false,
			isPending: false,
		});
	});

	it('인증 초기화 전에는 initializing 상태를 반환한다', () => {
		useAuthMock.mockReturnValue({ isAuthenticated: false, isInitialized: false });

		function StatusProbe() {
			return useSettingsAccess({ type: 'COLOG', slug: 'rilog' });
		}

		expect(renderToString(<StatusProbe />)).toContain('initializing');
	});

	it('비인증 사용자에게 unauthenticated 상태를 반환한다', () => {
		useAuthMock.mockReturnValue({ isAuthenticated: false, isInitialized: true });

		const { result } = renderHook(() => useSettingsAccess({ type: 'RILOG', slug: 'rilogger' }));

		expect(result.current).toBe('unauthenticated');
	});

	it('Rilog 설정은 로그인한 본인에게만 접근을 허용한다', async () => {
		const { result, rerender } = renderHook(() => useSettingsAccess({ type: 'RILOG', slug: 'rilogger' }));
		await waitFor(() => expect(result.current).toBe('authorized'));

		useMyInfoQueryMock.mockReturnValue({
			data: { status: 200, message: 'ok', data: { id: 1, slug: 'another' } },
			isError: false,
			isPending: false,
		});
		rerender();

		expect(result.current).toBe('forbidden');
	});

	it('Co-log 설정은 OWNER와 ADMIN에게만 접근을 허용한다', async () => {
		const { result, rerender } = renderHook(() => useSettingsAccess({ type: 'COLOG', slug: 'rilog' }));
		await waitFor(() => expect(result.current).toBe('authorized'));

		useCologMembersQueryMock.mockReturnValue({
			data: createMemberResponse('MEMBER'),
			isError: false,
			isPending: false,
		});
		rerender();

		expect(result.current).toBe('forbidden');
	});

	it('사용자 정보를 조회하는 동안 checking 상태를 반환한다', async () => {
		useMyInfoQueryMock.mockReturnValue({ isError: false, isPending: true });

		const { result } = renderHook(() => useSettingsAccess({ type: 'RILOG', slug: 'rilogger' }));

		await waitFor(() => expect(result.current).toBe('checking'));
	});

	it('Co-log 멤버 정보를 조회하는 동안 checking 상태를 반환한다', async () => {
		useCologMembersQueryMock.mockReturnValue({ isError: false, isPending: true });

		const { result } = renderHook(() => useSettingsAccess({ type: 'COLOG', slug: 'rilog' }));

		await waitFor(() => expect(result.current).toBe('checking'));
	});

	it('사용자 정보 조회 실패는 error 상태로 처리한다', async () => {
		useMyInfoQueryMock.mockReturnValue({ isError: true, isPending: false });

		const { result } = renderHook(() => useSettingsAccess({ type: 'RILOG', slug: 'rilogger' }));

		await waitFor(() => expect(result.current).toBe('error'));
	});

	it('Co-log 멤버 조회가 실패하거나 응답 데이터가 없으면 error 상태를 반환한다', async () => {
		useCologMembersQueryMock.mockReturnValue({ isError: true, isPending: false });
		const { result, rerender } = renderHook(() => useSettingsAccess({ type: 'COLOG', slug: 'rilog' }));
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
