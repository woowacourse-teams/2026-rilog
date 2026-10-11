import { useQuery } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Notification } from '@/domains/notification/model/notification';
import type { AuthContextValue } from '@/features/auth/model/auth-context';
import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { LOGIN_MODAL_CONTEXT } from '@/features/login/model/login-modal-context';
import { tokenManager } from '@/shared/api/auth/token-manager';
import {
	markAllNotificationsRead,
	markNotificationRead,
	readNotificationUnreadCount,
	readNotifications,
} from '@/shared/api/notifications/api';
import { notificationUnreadCountQueryOptions } from '@/shared/api/notifications/queries/unread-count/query-options';
import type { NotificationItemResponse } from '@/shared/api/notifications/types';
import { createNotification } from '@/test/fixtures/notification';
import { renderWithQuery } from '@/test/render-with-query';

import NotificationInbox from './NotificationInbox';

vi.mock('@/shared/api/notifications/api', () => ({
	readNotifications: vi.fn(),
	readNotificationUnreadCount: vi.fn(),
	markNotificationRead: vi.fn(),
	markAllNotificationsRead: vi.fn(),
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
	vi.mocked(markAllNotificationsRead).mockImplementation(() => {
		for (const notification of serverNotifications) notification.read = true;
		return Promise.resolve({ status: 200, message: '모든 알림을 읽음 처리했습니다.', data: null });
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
		vi.spyOn(tokenManager, 'getToken').mockReturnValue('access-token');
		vi.mocked(readNotificationUnreadCount)
			.mockReset()
			.mockResolvedValue({ status: 200, message: 'OK', data: { unreadCount: 1 } });
		vi.mocked(markNotificationRead).mockReset();
		vi.mocked(markAllNotificationsRead).mockReset();
	});

	afterEach(() => vi.restoreAllMocks());

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

	it('단건 읽음 처리 중에는 읽음 버튼들이 비활성화되고 실패 후 다시 사용할 수 있다', async () => {
		const user = userEvent.setup();
		const request = Promise.withResolvers<Awaited<ReturnType<typeof markNotificationRead>>>();
		renderInbox([createNotification({ id: 1 }), createNotification({ id: 2 })]);
		vi.mocked(markNotificationRead).mockReturnValueOnce(request.promise);
		const articles = await screen.findAllByRole('article');
		await user.click(within(articles[0]).getByRole('button', { name: '읽음으로 표시' }));

		await waitFor(() => {
			for (const article of articles) {
				expect(within(article).getByRole('button', { name: '읽음으로 표시' })).toBeDisabled();
			}
			expect(screen.getByRole('button', { name: '모두 읽음' })).toBeDisabled();
		});

		request.reject(new Error('request failed'));
		await waitFor(() => {
			for (const article of articles) {
				expect(within(article).getByRole('button', { name: '읽음으로 표시' })).toBeEnabled();
			}
			expect(screen.getByRole('button', { name: '모두 읽음' })).toBeEnabled();
		});
	});

	it('단건 읽음 요청이 끝나도 미읽음 수 재조회가 끝날 때까지 모두 읽음을 비활성화한다', async () => {
		const user = userEvent.setup();
		const unreadCountResponse = Promise.withResolvers<Awaited<ReturnType<typeof readNotificationUnreadCount>>>();
		renderInbox([createNotification()], {}, true);
		const article = await screen.findByRole('article');
		await waitFor(() => expect(screen.getByRole('status', { name: '읽지 않은 알림 수' })).toHaveTextContent('1'));
		vi.mocked(readNotificationUnreadCount).mockClear().mockReturnValue(unreadCountResponse.promise);

		await user.click(within(article).getByRole('button', { name: '읽음으로 표시' }));
		await waitFor(() => expect(readNotificationUnreadCount).toHaveBeenCalled());
		await waitFor(() => expect(article).toHaveAccessibleDescription('읽은 알림'));
		expect(screen.getByRole('button', { name: '모두 읽음' })).toBeDisabled();
		await user.click(screen.getByRole('button', { name: '모두 읽음' }));
		expect(markAllNotificationsRead).not.toHaveBeenCalled();

		unreadCountResponse.resolve({ status: 200, message: 'OK', data: { unreadCount: 0 } });
		await waitFor(() => expect(screen.getByRole('status', { name: '읽지 않은 알림 수' })).toHaveTextContent('0'));
	});

	it('모두 읽음을 누르면 전체 알림과 읽지 않은 수를 갱신하고 추가 처리를 비활성화한다', async () => {
		const user = userEvent.setup();
		const notifications = [createNotification({ id: 1 }), createNotification({ id: 2, type: 'SELECTION_COMMENT' })];
		vi.mocked(readNotificationUnreadCount)
			.mockResolvedValueOnce({ status: 200, message: 'OK', data: { unreadCount: 2 } })
			.mockResolvedValue({ status: 200, message: 'OK', data: { unreadCount: 0 } });
		renderInbox(notifications, {}, true);
		await screen.findAllByRole('article');
		await waitFor(() => expect(screen.getByRole('status', { name: '읽지 않은 알림 수' })).toHaveTextContent('2'));
		await user.click(screen.getByRole('button', { name: '모두 읽음' }));
		await waitFor(() => {
			for (const article of screen.getAllByRole('article')) expect(article).toHaveAccessibleDescription('읽은 알림');
		});
		expect(markAllNotificationsRead).toHaveBeenCalledOnce();
		expect(screen.queryByRole('button', { name: '읽음으로 표시' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: '모두 읽음' })).toBeDisabled();
		await waitFor(() => expect(screen.getByRole('status', { name: '읽지 않은 알림 수' })).toHaveTextContent('0'));
	});

	it('현재 목록이 모두 읽혔어도 서버에 읽지 않은 알림이 남아 있으면 모두 읽을 수 있다', async () => {
		const user = userEvent.setup();
		vi.mocked(readNotificationUnreadCount)
			.mockResolvedValueOnce({ status: 200, message: 'OK', data: { unreadCount: 1 } })
			.mockResolvedValue({ status: 200, message: 'OK', data: { unreadCount: 0 } });
		renderInbox([createNotification({ isRead: true })]);
		const article = await screen.findByRole('article');
		expect(article).toHaveAccessibleDescription('읽은 알림');
		const readAllButton = screen.getByRole('button', { name: '모두 읽음' });
		await waitFor(() => expect(readAllButton).toBeEnabled());

		await user.click(readAllButton);
		expect(markAllNotificationsRead).toHaveBeenCalledOnce();
		await waitFor(() => expect(readAllButton).toBeDisabled());
	});

	it('목록에 읽지 않은 알림이 보여도 서버의 전체 안읽음 수가 0이면 모두 읽음을 비활성화한다', async () => {
		vi.mocked(readNotificationUnreadCount).mockResolvedValue({ status: 200, message: 'OK', data: { unreadCount: 0 } });
		renderInbox([createNotification()]);
		const article = await screen.findByRole('article');
		expect(article).toHaveAccessibleDescription('읽지 않은 알림');
		await waitFor(() => expect(readNotificationUnreadCount).toHaveBeenCalled());
		expect(screen.getByRole('button', { name: '모두 읽음' })).toBeDisabled();
	});

	it('전체 안읽음 수 응답을 기다리는 동안 모두 읽음을 비활성화한다', async () => {
		const request = Promise.withResolvers<Awaited<ReturnType<typeof readNotificationUnreadCount>>>();
		vi.mocked(readNotificationUnreadCount).mockReturnValueOnce(request.promise);
		renderInbox([createNotification()]);
		await screen.findByRole('article');
		const readAllButton = screen.getByRole('button', { name: '모두 읽음' });
		expect(readAllButton).toBeDisabled();

		request.resolve({ status: 200, message: 'OK', data: { unreadCount: 1 } });
		await waitFor(() => expect(readAllButton).toBeEnabled());
	});

	it('전체 읽음 요청이 실패하면 읽지 않은 상태를 유지하고 다시 시도할 수 있다', async () => {
		const user = userEvent.setup();
		renderInbox([createNotification({ id: 1 })]);
		vi.mocked(markAllNotificationsRead).mockRejectedValueOnce(new Error('request failed'));
		const article = await screen.findByRole('article');
		await user.click(screen.getByRole('button', { name: '모두 읽음' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('모든 알림을 읽음 처리하지 못했어요.');
		expect(article).toHaveAccessibleDescription('읽지 않은 알림');

		await user.click(screen.getByRole('button', { name: '모두 읽음' }));
		await waitFor(() => expect(article).toHaveAccessibleDescription('읽은 알림'));
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('전체 읽음 처리 중에는 읽음 버튼들이 비활성화되고 실패 후 다시 사용할 수 있다', async () => {
		const user = userEvent.setup();
		const request = Promise.withResolvers<Awaited<ReturnType<typeof markAllNotificationsRead>>>();
		renderInbox([createNotification()]);
		vi.mocked(markAllNotificationsRead).mockReturnValueOnce(request.promise);
		const article = await screen.findByRole('article');
		await user.click(screen.getByRole('button', { name: '모두 읽음' }));

		await waitFor(() => {
			expect(screen.getByRole('button', { name: '모두 읽음' })).toBeDisabled();
			expect(within(article).getByRole('button', { name: '읽음으로 표시' })).toBeDisabled();
		});

		request.reject(new Error('request failed'));
		await waitFor(() => {
			expect(screen.getByRole('button', { name: '모두 읽음' })).toBeEnabled();
			expect(within(article).getByRole('button', { name: '읽음으로 표시' })).toBeEnabled();
		});
	});

	it('전체 읽음 요청이 끝나도 목록 재조회가 끝날 때까지 읽음 버튼들을 비활성화한다', async () => {
		const user = userEvent.setup();
		const listResponse = Promise.withResolvers<void>();
		renderInbox([createNotification()]);
		const article = await screen.findByRole('article');
		await waitFor(() => expect(screen.getByRole('button', { name: '모두 읽음' })).toBeEnabled());
		const readList = vi.mocked(readNotifications).getMockImplementation();
		if (!readList) throw new Error('알림 목록 mock이 설정되지 않았습니다.');
		vi.mocked(readNotifications)
			.mockClear()
			.mockImplementation(async (request) => {
				await listResponse.promise;
				return readList(request);
			});

		await user.click(screen.getByRole('button', { name: '모두 읽음' }));
		await waitFor(() => expect(readNotifications).toHaveBeenCalled());
		expect(within(article).getByRole('button', { name: '읽음으로 표시' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '모두 읽음' })).toBeDisabled();
		await user.click(within(article).getByRole('button', { name: '읽음으로 표시' }));
		expect(markNotificationRead).not.toHaveBeenCalled();

		listResponse.resolve();
		await waitFor(() => expect(article).toHaveAccessibleDescription('읽은 알림'));
	});
});
