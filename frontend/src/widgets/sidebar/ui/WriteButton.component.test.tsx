import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
	afterEach(() => window.history.replaceState(null, '', '/'));

	it('Guest가 글쓰기를 누르면 로그인 모달을 열고 글쓰기 페이지로 이동하지 않는다', async () => {
		const user = userEvent.setup();
		renderWriteButton(false);

		await user.click(screen.getByRole('button', { name: '글쓰기' }));

		expect(screen.getByRole('dialog', { name: '로그인' })).toBeInTheDocument();
		expect(routerPushMock).not.toHaveBeenCalled();
		expect(consumeEditorEntryContext()).toBe('direct');
	});

	it('비회원이 글쓰기를 누르고 로그인 후 원래 페이지로 돌아오면 글쓰기 페이지로 이동한다', async () => {
		const user = userEvent.setup();
		window.history.replaceState(null, '', '/feeds');
		const guestView = renderWriteButton(false);

		await user.click(screen.getByRole('button', { name: '글쓰기' }));
		guestView.unmount();

		renderWriteButton(true);

		expect(routerPushMock).toHaveBeenCalledWith('/write');
		expect(consumeEditorEntryContext()).toBe('sidebar');
	});

	it('로그인 후 다른 페이지에 도착하면 글쓰기 페이지로 이동하지 않는다', async () => {
		const user = userEvent.setup();
		window.history.replaceState(null, '', '/feeds');
		const guestView = renderWriteButton(false);

		await user.click(screen.getByRole('button', { name: '글쓰기' }));
		guestView.unmount();
		window.history.replaceState(null, '', '/notifications');

		renderWriteButton(true);

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
