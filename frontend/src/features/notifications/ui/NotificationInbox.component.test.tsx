import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Notification } from '@/domains/notification/model/notification';
import type { AuthContextValue } from '@/features/auth/model/auth-context';
import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { LOGIN_MODAL_CONTEXT } from '@/features/login/model/login-modal-context';
import { createNotification } from '@/test/fixtures/notification';

import NotificationInbox from './NotificationInbox';

function renderInbox(
	initialNotifications: readonly Notification[] = [createNotification()],
	overrides: Partial<AuthContextValue> = {},
) {
	const login = vi.fn();
	render(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false, ...overrides }}>
			<LOGIN_MODAL_CONTEXT.Provider value={login}>
				<NotificationInbox initialNotifications={initialNotifications} />
			</LOGIN_MODAL_CONTEXT.Provider>
		</AUTH_CONTEXT.Provider>,
	);
	return { login };
}

describe('NotificationInbox', () => {
	it('인증 확인 중에는 알림 내용을 표시하지 않는다', () => {
		renderInbox(undefined, { isInitialized: false });
		expect(screen.getByRole('status', { name: '알림 불러오는 중' })).toBeInTheDocument();
		expect(screen.queryByRole('article')).not.toBeInTheDocument();
	});

	it('비로그인 상태에서 로그인 버튼을 누르면 기존 로그인 흐름을 시작한다', async () => {
		const user = userEvent.setup();
		const { login } = renderInbox(undefined, { isAuthenticated: false });
		expect(screen.queryByRole('article')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '로그인' }));
		expect(login).toHaveBeenCalledOnce();
	});

	it('키보드로 읽음 처리하면 해당 알림만 갱신하고 focus와 원본 데이터를 보존한다', async () => {
		const user = userEvent.setup();
		const first = createNotification();
		const second = createNotification({ id: 2, author: { ...first.author, id: 12, nickname: '다른 작성자' } });
		const notifications = [first, second];
		const original = structuredClone(notifications);
		renderInbox(notifications);
		const article = screen.getByRole('article', { name: `${first.author.nickname}님의 댓글 알림` });
		const otherArticle = screen.getByRole('article', { name: `${second.author.nickname}님의 댓글 알림` });
		expect(article).toHaveAccessibleDescription('읽지 않은 알림');
		within(article).getByRole('button', { name: '읽음으로 표시' }).focus();
		await user.keyboard('{Enter}');

		expect(article).toHaveFocus();
		expect(article).toHaveAccessibleDescription('읽은 알림');
		expect(within(article).queryByRole('button', { name: '읽음으로 표시' })).not.toBeInTheDocument();
		expect(otherArticle).toHaveAccessibleDescription('읽지 않은 알림');
		expect(within(otherArticle).getByRole('button', { name: '읽음으로 표시' })).toBeEnabled();
		expect(screen.getAllByRole('article')).toHaveLength(notifications.length);
		expect(notifications).toEqual(original);
	});

	it('모두 읽음을 누르면 전체 알림을 보존하며 읽음 처리하고 추가 처리를 비활성화한다', async () => {
		const user = userEvent.setup();
		const notifications = [
			createNotification({ id: 1 }),
			createNotification({ id: 2, type: 'SELECTION_COMMENT' }),
			createNotification({ id: 3, isRead: true }),
		];
		const original = structuredClone(notifications);
		renderInbox(notifications);
		await user.click(screen.getByRole('button', { name: '모두 읽음' }));

		const articles = screen.getAllByRole('article');
		expect(articles).toHaveLength(notifications.length);
		for (const article of articles) {
			expect(article).toHaveAccessibleDescription('읽은 알림');
		}
		expect(screen.queryByRole('button', { name: '읽음으로 표시' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: '모두 읽음' })).toBeDisabled();
		expect(notifications).toEqual(original);
	});
});
