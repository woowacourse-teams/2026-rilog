import { useQuery } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Notification } from '@/domains/notification/model/notification';
import type { AuthContextValue } from '@/features/auth/model/auth-context';
import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { LOGIN_MODAL_CONTEXT } from '@/features/login/model/login-modal-context';
import { markNotificationRead, readNotificationUnreadCount, readNotifications } from '@/shared/api/notifications/api';
import { notificationUnreadCountQueryOptions } from '@/shared/api/notifications/queries/unread-count/query-options';
import type { NotificationItemResponse } from '@/shared/api/notifications/types';
import { createNotification } from '@/test/fixtures/notification';
import { renderWithQuery } from '@/test/render-with-query';

import NotificationInbox from './NotificationInbox';

vi.mock('@/shared/api/notifications/api', () => ({
	readNotifications: vi.fn(),
	readNotificationUnreadCount: vi.fn(),
	markNotificationRead: vi.fn(),
}));

function UnreadCountStatus() {
	const { data } = useQuery(notificationUnreadCountQueryOptions());
	return <output aria-label="읽지 않은 알림 수">{data?.data?.unreadCount}</output>;
}

function toResponse(notification: Notification): NotificationItemResponse {
	return {
		notificationId: notification.id,
		type: notification.type === 'POST_COMMENT' ? 'POST_INLINE_COMMENT' : 'SELECTION_INLINE_COMMENT',
		read: notification.isRead,
		readAt: null,
		createdAt: notification.createdAt,
		sourceStatus: 'AVAILABLE',
		content: {
			post: {
				postId: notification.post.id,
				title: notification.post.title,
				blogId: 1,
				blogSlug: notification.post.slug,
			},
			selection: {
				selectionId: notification.anchor.id,
				blockId: 'block-1',
				startOffset: 0,
				endOffset: 1,
				selectedText: notification.anchor.content,
				status: 'ACTIVE',
			},
			commentAnchor: { commentAnchorId: notification.comment.id, content: notification.comment.content },
			actor: {
				userId: notification.author.id,
				nickname: notification.author.nickname,
				slug: notification.author.slug,
				profileImageUrl: notification.author.profileImageUrl,
			},
		},
	};
}

function renderInbox(
	notifications: readonly Notification[] = [createNotification()],
	overrides: Partial<AuthContextValue> = {},
	showUnreadCount = false,
) {
	const login = vi.fn();
	const serverNotifications = notifications.map(toResponse);
	vi.mocked(readNotifications).mockImplementation(() =>
		Promise.resolve({
			status: 200,
			message: '알림 목록을 조회했습니다.',
			data: {
				notifications: serverNotifications.map((notification) => ({ ...notification })),
				page: 0,
				size: 20,
				numberOfElements: notifications.length,
				hasNext: false,
			},
		}),
	);
	vi.mocked(markNotificationRead).mockImplementation((id) => {
		const notification = serverNotifications.find((item) => item.notificationId === id);
		if (notification) notification.read = true;
		return Promise.resolve({ status: 200, message: '알림을 읽음 처리했습니다.', data: null });
	});
	renderWithQuery(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false, ...overrides }}>
			<LOGIN_MODAL_CONTEXT.Provider value={login}>
				<NotificationInbox />
				{showUnreadCount && <UnreadCountStatus />}
			</LOGIN_MODAL_CONTEXT.Provider>
		</AUTH_CONTEXT.Provider>,
	);
	return { login };
}

describe('NotificationInbox', () => {
	beforeEach(() => {
		vi.mocked(readNotificationUnreadCount).mockReset();
		vi.mocked(markNotificationRead).mockReset();
	});

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
		vi.mocked(readNotificationUnreadCount)
			.mockResolvedValueOnce({
				status: 200,
				message: 'OK',
				data: { unreadCount: 2 },
			})
			.mockResolvedValue({
				status: 200,
				message: 'OK',
				data: { unreadCount: 1 },
			});
		renderInbox(notifications, {}, true);
		const article = await screen.findByRole('article', { name: `${first.author.nickname}님의 댓글 알림` });
		const otherArticle = screen.getByRole('article', { name: `${second.author.nickname}님의 댓글 알림` });
		await waitFor(() => expect(screen.getByRole('status', { name: '읽지 않은 알림 수' })).toHaveTextContent('2'));
		expect(article).toHaveAccessibleDescription('읽지 않은 알림');
		vi.mocked(readNotifications).mockClear();
		within(article).getByRole('button', { name: '읽음으로 표시' }).focus();
		await user.keyboard('{Enter}');
		expect(article).toHaveFocus();
		await waitFor(() => expect(article).toHaveAccessibleDescription('읽은 알림'));
		expect(markNotificationRead).toHaveBeenCalledWith(first.id);
		expect(within(article).queryByRole('button', { name: '읽음으로 표시' })).not.toBeInTheDocument();
		expect(otherArticle).toHaveAccessibleDescription('읽지 않은 알림');
		expect(screen.getAllByRole('article')).toHaveLength(notifications.length);
		expect(notifications).toEqual(original);
		await waitFor(() => expect(readNotifications).toHaveBeenCalled());
		await waitFor(() => expect(screen.getByRole('status', { name: '읽지 않은 알림 수' })).toHaveTextContent('1'));
	});

	it('읽음 요청이 실패하면 읽지 않은 상태를 유지하고 다시 시도할 수 있다', async () => {
		const user = userEvent.setup();
		renderInbox();
		vi.mocked(markNotificationRead).mockRejectedValueOnce(new Error('request failed'));
		const article = await screen.findByRole('article');
		await user.click(within(article).getByRole('button', { name: '읽음으로 표시' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('알림을 읽음 처리하지 못했어요.');
		expect(article).toHaveAccessibleDescription('읽지 않은 알림');

		await user.click(within(article).getByRole('button', { name: '읽음으로 표시' }));
		await waitFor(() => expect(article).toHaveAccessibleDescription('읽은 알림'));
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	// 전체 읽음 API 연동 시 이 사용자 흐름을 다시 활성화한다.
	it.skip('모두 읽음을 누르면 전체 알림을 보존하며 읽음 처리하고 추가 처리를 비활성화한다', async () => {
		const user = userEvent.setup();
		const notifications = [createNotification({ id: 1 }), createNotification({ id: 2, type: 'SELECTION_COMMENT' })];
		renderInbox(notifications);
		await screen.findAllByRole('article');
		await user.click(screen.getByRole('button', { name: '모두 읽음' }));
		for (const article of screen.getAllByRole('article')) expect(article).toHaveAccessibleDescription('읽은 알림');
		expect(screen.queryByRole('button', { name: '읽음으로 표시' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: '모두 읽음' })).toBeDisabled();
	});
});
