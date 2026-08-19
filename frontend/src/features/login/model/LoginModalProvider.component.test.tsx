import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import LoginModalProvider from './LoginModalProvider';
import { useAuthAction } from './use-auth-action';
import { useLoginModal } from './use-login-modal';

function LoginButton() {
	const login = useLoginModal();

	return <button onClick={login}>로그인 열기</button>;
}

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';

function AuthActionButton({ action }: { action: () => void }) {
	const handleClick = useAuthAction({ action });

	return <button onClick={handleClick}>인증 필요 action</button>;
}

describe('LoginModalProvider', () => {
	it('useLoginModal이 반환한 login 함수로 전역 로그인 모달을 연다', async () => {
		const user = userEvent.setup();
		render(
			<LoginModalProvider>
				<LoginButton />
			</LoginModalProvider>,
		);

		await user.click(screen.getByRole('button', { name: '로그인 열기' }));

		expect(screen.getByRole('dialog', { name: '로그인' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'GitHub로 계속하기' })).toHaveFocus();
	});

	it('useAuthAction은 비인증 상태에서 action 대신 로그인 모달을 연다', async () => {
		const user = userEvent.setup();
		const action = vi.fn();
		render(
			<AUTH_CONTEXT.Provider value={{ isAuthenticated: false, setIsAuthenticated: vi.fn() }}>
				<LoginModalProvider>
					<AuthActionButton action={action} />
				</LoginModalProvider>
			</AUTH_CONTEXT.Provider>
		);

		await user.click(screen.getByRole('button', { name: '인증 필요 action' }));

		expect(action).not.toHaveBeenCalled();
		expect(screen.getByRole('dialog', { name: '로그인' })).toBeInTheDocument();
	});

	it('useAuthAction은 인증 상태에서 원래 action을 실행한다', async () => {
		const user = userEvent.setup();
		const action = vi.fn();
		render(
			<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, setIsAuthenticated: vi.fn() }}>
				<LoginModalProvider>
					<AuthActionButton action={action} />
				</LoginModalProvider>
			</AUTH_CONTEXT.Provider>
		);

		await user.click(screen.getByRole('button', { name: '인증 필요 action' }));

		expect(action).toHaveBeenCalledOnce();
		expect(screen.queryByRole('dialog', { name: '로그인' })).not.toBeInTheDocument();
	});
});
