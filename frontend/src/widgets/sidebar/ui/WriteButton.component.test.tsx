import { fireEvent, render, screen } from '@testing-library/react';
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
		<AUTH_CONTEXT.Provider value={{ isOnboarding: false, isAuthenticated, sessionVersion: 0, isInitialized: true }}>
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

		await user.click(screen.getByRole('link', { name: '글쓰기' }));

		expect(screen.getByRole('dialog', { name: '로그인' })).toBeInTheDocument();
		expect(routerPushMock).not.toHaveBeenCalled();
		expect(consumeEditorEntryContext()).toBe('direct');
	});

	it('비회원이 글쓰기를 누르고 로그인 후 원래 페이지로 돌아오면 글쓰기 페이지로 이동한다', async () => {
		const user = userEvent.setup();
		window.history.replaceState(null, '', '/feeds');
		const guestView = renderWriteButton(false);

		await user.click(screen.getByRole('link', { name: '글쓰기' }));
		guestView.unmount();

		renderWriteButton(true);

		expect(routerPushMock).toHaveBeenCalledWith('/write');
		expect(consumeEditorEntryContext()).toBe('sidebar');
	});

	it('글쓰기 로그인 모달을 닫으면 이후 로그인해도 글쓰기로 이동하지 않는다', async () => {
		const user = userEvent.setup();
		window.history.replaceState(null, '', '/feeds');
		const guestView = renderWriteButton(false);

		await user.click(screen.getByRole('link', { name: '글쓰기' }));
		await user.click(screen.getByRole('button', { name: '모달 닫기' }));
		guestView.unmount();
		renderWriteButton(true);

		expect(routerPushMock).not.toHaveBeenCalled();
		expect(consumeEditorEntryContext()).toBe('direct');
	});

	it('로그인 후 다른 페이지에 도착하면 글쓰기 페이지로 이동하지 않는다', async () => {
		const user = userEvent.setup();
		window.history.replaceState(null, '', '/feeds');
		const guestView = renderWriteButton(false);

		await user.click(screen.getByRole('link', { name: '글쓰기' }));
		guestView.unmount();
		window.history.replaceState(null, '', '/notifications');

		renderWriteButton(true);

		expect(routerPushMock).not.toHaveBeenCalled();
		expect(consumeEditorEntryContext()).toBe('direct');
	});

	it('인증 사용자의 글쓰기 링크는 목적지와 사이드바 진입을 기록한다', async () => {
		const user = userEvent.setup();
		renderWriteButton(true);

		const link = screen.getByRole('link', { name: '글쓰기' });
		expect(link).toHaveAttribute('href', '/write');
		await user.click(link);

		expect(consumeEditorEntryContext()).toBe('sidebar');
		expect(screen.queryByRole('dialog', { name: '로그인' })).not.toBeInTheDocument();
	});

	it('설정 화면의 이탈 보호가 글쓰기 링크를 가로채면 진입 정보를 기록하지 않는다', () => {
		renderWriteButton(true);
		const link = screen.getByRole('link', { name: '글쓰기' });
		const guard = (event: MouseEvent) => event.preventDefault();
		document.addEventListener('click', guard, true);

		try {
			fireEvent.click(link);
			expect(consumeEditorEntryContext()).toBe('direct');
			expect(routerPushMock).not.toHaveBeenCalled();
		} finally {
			document.removeEventListener('click', guard, true);
		}
	});

	it.each(['metaKey', 'ctrlKey'] as const)('%s 클릭은 링크의 새 탭 동작을 유지한다', (modifier) => {
		renderWriteButton(true);
		const link = screen.getByRole('link', { name: '글쓰기' });
		const didNotPreventDefault = fireEvent.click(link, { [modifier]: true });

		expect(didNotPreventDefault).toBe(true);
		expect(consumeEditorEntryContext()).toBe('direct');
		expect(routerPushMock).not.toHaveBeenCalled();
	});

	it('비회원의 수정키 클릭은 현재 탭에 로그인 모달을 열지 않는다', () => {
		renderWriteButton(false);
		const link = screen.getByRole('link', { name: '글쓰기' });
		const didNotPreventDefault = fireEvent.click(link, { metaKey: true });

		expect(didNotPreventDefault).toBe(true);
		expect(screen.queryByRole('dialog', { name: '로그인' })).not.toBeInTheDocument();
	});
});
