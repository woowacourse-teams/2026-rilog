import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/features/auth/model/use-auth';

import AuthProvider from './AuthProvider';

const {
	clearProxySessionMock,
	getTokenMock,
	publishLoginMock,
	refreshMock,
	registerProxySessionMock,
	subscribeLoginMock,
	subscribeLogoutMock,
} = vi.hoisted(() => ({
	clearProxySessionMock: vi.fn(),
	getTokenMock: vi.fn(),
	publishLoginMock: vi.fn(),
	refreshMock: vi.fn(),
	registerProxySessionMock: vi.fn(),
	subscribeLoginMock: vi.fn(),
	subscribeLogoutMock: vi.fn(),
}));

type AuthListener = () => void | Promise<void>;

let loginListener: AuthListener | undefined;
let logoutListener: AuthListener | undefined;

vi.mock('@/shared/api/proxy/api', () => ({
	clearProxySession: clearProxySessionMock,
	registerProxySession: registerProxySessionMock,
}));

vi.mock('@/shared/api/auth/token-manager', () => ({
	tokenManager: {
		getToken: getTokenMock,
		publishLogin: publishLoginMock,
		refresh: refreshMock,
		subscribeLogin: subscribeLoginMock,
		subscribeLogout: subscribeLogoutMock,
	},
}));

function AuthState() {
	const { isAuthenticated, isInitialized } = useAuth();

	return <p>{`${isAuthenticated}:${isInitialized}`}</p>;
}

describe('AuthProvider', () => {
	beforeEach(() => {
		loginListener = undefined;
		logoutListener = undefined;
		clearProxySessionMock.mockReset();
		clearProxySessionMock.mockResolvedValue(undefined);
		getTokenMock.mockReset();
		publishLoginMock.mockReset();
		refreshMock.mockReset();
		registerProxySessionMock.mockReset();
		registerProxySessionMock.mockResolvedValue(undefined);
		subscribeLoginMock.mockReset();
		subscribeLogoutMock.mockReset();
		subscribeLoginMock.mockImplementation((listener: AuthListener) => {
			loginListener = listener;
			return vi.fn();
		});
		subscribeLogoutMock.mockImplementation((listener: AuthListener) => {
			logoutListener = listener;
			return vi.fn();
		});
		publishLoginMock.mockImplementation(async () => {
			try {
				await loginListener?.();
			} catch {
				// TokenManager는 listener 실패가 인증 전이를 중단하지 않도록 격리한다.
			}
		});
	});

	it('토큰 재발급이 끝난 뒤 인증 초기화 상태를 제공한다', async () => {
		getTokenMock.mockReturnValue(null);
		refreshMock.mockResolvedValue('refreshed-token');

		render(
			<AuthProvider>
				<AuthState />
			</AuthProvider>,
		);

		await waitFor(() => expect(screen.getByText('true:true')).toBeInTheDocument());
		expect(refreshMock).toHaveBeenCalledOnce();
		expect(publishLoginMock).toHaveBeenCalledWith('refreshed-token');
		expect(registerProxySessionMock).toHaveBeenCalledOnce();
	});

	it('login과 logout 이벤트에 따라 인증 상태를 변경한다', async () => {
		getTokenMock.mockReturnValue('existing-token');

		render(
			<AuthProvider>
				<AuthState />
			</AuthProvider>,
		);

		await waitFor(() => expect(screen.getByText('true:true')).toBeInTheDocument());

		await act(async () => {
			await logoutListener?.();
		});

		expect(screen.getByText('false:true')).toBeInTheDocument();
		expect(clearProxySessionMock).toHaveBeenCalledOnce();
	});

	it('proxy session 등록이 실패해도 유효한 token의 인증 상태를 유지한다', async () => {
		getTokenMock.mockReturnValue('existing-token');
		registerProxySessionMock.mockRejectedValue(new Error('proxy session failed'));

		render(
			<AuthProvider>
				<AuthState />
			</AuthProvider>,
		);

		await waitFor(() => expect(screen.getByText('true:true')).toBeInTheDocument());
	});
});
