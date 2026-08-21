import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tokenManager } from '@/shared/api/auth/token-manager';
import { APP_ROUTES } from '@/shared/routes/app-routes';

import { hasActiveSignUpFlow, startSignUpFlow } from '../lib/sign-up-flow-session';

import SignUpAccessGuard from './SignUpAccessGuard';

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
}));

describe('SignUpAccessGuard', () => {
	beforeEach(() => {
		replaceMock.mockReset();
		sessionStorage.clear();
	});

	it('GitHub callback이 시작한 회원가입 흐름이면 콘텐츠를 보여준다', async () => {
		startSignUpFlow();

		renderGuard();

		expect(await screen.findByText('회원가입 콘텐츠')).toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it('회원가입 흐름 표식이 없으면 콘텐츠를 숨기고 피드로 이동한다', async () => {
		const user = userEvent.setup();
		renderGuard();

		expect(screen.queryByText('회원가입 콘텐츠')).not.toBeInTheDocument();
		expect(await screen.findByRole('alertdialog', { name: '회원가입을 진행할 수 없습니다.' })).toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: '확인' }));

		expect(replaceMock).toHaveBeenCalledWith(APP_ROUTES.feeds, { scroll: false });
	});

	it('회원가입 중 로그아웃되면 흐름을 제거하고 피드로 이동한다', async () => {
		startSignUpFlow();
		renderGuard();
		await screen.findByText('회원가입 콘텐츠');

		await act(async () => tokenManager.publishLogout());

		expect(hasActiveSignUpFlow()).toBe(false);
		await waitFor(() => {
			expect(screen.queryByText('회원가입 콘텐츠')).not.toBeInTheDocument();
			expect(screen.getByRole('alertdialog', { name: '회원가입을 진행할 수 없습니다.' })).toBeInTheDocument();
		});
	});
});

function renderGuard() {
	return render(
		<SignUpAccessGuard>
			<div>회원가입 콘텐츠</div>
		</SignUpAccessGuard>,
	);
}
