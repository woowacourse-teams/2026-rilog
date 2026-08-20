import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/features/auth/model/use-auth';

import AuthProvider from './AuthProvider';

const { clearTokenMock, getTokenMock, refreshMock, subscribeLogoutMock } = vi.hoisted(() => ({
	clearTokenMock: vi.fn(),
	getTokenMock: vi.fn(),
	refreshMock: vi.fn(),
	subscribeLogoutMock: vi.fn(),
}));

vi.mock('@/shared/api/auth/token-manager', () => ({
	tokenManager: {
		clearToken: clearTokenMock,
		getToken: getTokenMock,
		refresh: refreshMock,
		subscribeLogout: subscribeLogoutMock,
	},
}));

function AuthState() {
	const { isAuthenticated, isInitialized } = useAuth();

	return <p>{`${isAuthenticated}:${isInitialized}`}</p>;
}

describe('AuthProvider', () => {
	beforeEach(() => {
		clearTokenMock.mockReset();
		getTokenMock.mockReset();
		refreshMock.mockReset();
		subscribeLogoutMock.mockReset();
		subscribeLogoutMock.mockReturnValue(vi.fn());
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
	});
});
