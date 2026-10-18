import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { consumeEditorEntryContext } from '@/features/analytics/lib/editor-entry-context';
import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import LoginModalProvider from '@/features/login/model/LoginModalProvider';

import WriteButton from './WriteButton';

const { routerPushMock } = vi.hoisted(() => ({ routerPushMock: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: routerPushMock }) }));

function renderWriteButton(isAuthenticated: boolean) {
	return render(
		<AUTH_CONTEXT.Provider value={{ isOnboarding: false, isAuthenticated, isInitialized: true }}>
			<LoginModalProvider>
				<WriteButton />
			</LoginModalProvider>
		</AUTH_CONTEXT.Provider>,
	);
}

describe('WriteButton', () => {
	beforeEach(() => {
		routerPushMock.mockReset();
		sessionStorage.clear();
	});

	it('Guest가 글쓰기를 누르면 로그인 모달을 열고 글쓰기 페이지로 이동하지 않는다', async () => {
		const user = userEvent.setup();
		renderWriteButton(false);

		await user.click(screen.getByRole('button', { name: '글쓰기' }));

		expect(screen.getByRole('dialog', { name: '로그인' })).toBeInTheDocument();
		expect(routerPushMock).not.toHaveBeenCalled();
		expect(consumeEditorEntryContext()).toBe('direct');
	});

	it('인증 사용자가 글쓰기를 누르면 사이드바 진입을 기록하고 글쓰기 페이지로 이동한다', async () => {
		const user = userEvent.setup();
		renderWriteButton(true);

		await user.click(screen.getByRole('button', { name: '글쓰기' }));

		expect(routerPushMock).toHaveBeenCalledWith('/write');
		expect(consumeEditorEntryContext()).toBe('sidebar');
		expect(screen.queryByRole('dialog', { name: '로그인' })).not.toBeInTheDocument();
	});
});
