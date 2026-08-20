import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/features/auth/model/use-auth';

import AuthProvider from './AuthProvider';

const { getTokenMock, publishLoginMock, refreshMock, subscribeLoginMock, subscribeLogoutMock } = vi.hoisted(() => ({
	getTokenMock: vi.fn(),
	publishLoginMock: vi.fn(),
	refreshMock: vi.fn(),
	subscribeLoginMock: vi.fn(),
	subscribeLogoutMock: vi.fn(),
}));

let loginListener: (() => void) | undefined;
let logoutListener: (() => void) | undefined;

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
		getTokenMock.mockReset();
		publishLoginMock.mockReset();
		refreshMock.mockReset();
		subscribeLoginMock.mockReset();
		subscribeLogoutMock.mockReset();
		subscribeLoginMock.mockImplementation((listener: () => void) => {
			loginListener = listener;
			return vi.fn();
		});
		subscribeLogoutMock.mockImplementation((listener: () => void) => {
			logoutListener = listener;
			return vi.fn();
		});
		publishLoginMock.mockImplementation(() => {
			loginListener?.();
			return Promise.resolve();
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
	});

	it('login과 logout 이벤트에 따라 인증 상태를 변경한다', async () => {
		getTokenMock.mockReturnValue('existing-token');

		render(
			<AuthProvider>
				<AuthState />
			</AuthProvider>,
		);

		await waitFor(() => expect(screen.getByText('true:true')).toBeInTheDocument());

		act(() => {
			logoutListener?.();
		});

		expect(screen.getByText('false:true')).toBeInTheDocument();
	});
});
