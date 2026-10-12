import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import type * as NextLinkModule from 'next/link';

import { analytics } from '@/features/analytics/model/events';
import { createNotification } from '@/test/fixtures/notification';

import NotificationCommentContent from './NotificationCommentContent';

const linkStatus = vi.hoisted(() => ({ pending: false }));
const analyticsMock = vi.hoisted(() => ({ notificationItemOpened: vi.fn() }));

vi.mock('@/features/analytics/model/events', () => ({ analytics: analyticsMock }));

vi.mock('next/link', async (importOriginal) => {
	const actual = await importOriginal<typeof NextLinkModule>();
	return { ...actual, useLinkStatus: () => ({ pending: linkStatus.pending }) };
});

it('삭제된 댓글 알림을 다시 클릭하면 각 클릭을 같은 알림 ID와 화면 상태로 기록한다', () => {
	vi.mocked(analytics.notificationItemOpened).mockClear();
	const notification = createNotification({ state: 'comment-deleted' });
	render(<NotificationCommentContent notification={notification} onRead={vi.fn()} />);
	const link = screen.getByRole('link', { name: `${notification.post.title} 게시글의 댓글 보기` });
	link.addEventListener('click', (event) => event.preventDefault(), { capture: true });

	fireEvent.click(link);
	fireEvent.click(link);

	expect(analytics.notificationItemOpened).toHaveBeenCalledTimes(2);
	expect(analytics.notificationItemOpened).toHaveBeenNthCalledWith(1, { notification });
	expect(analytics.notificationItemOpened).toHaveBeenNthCalledWith(2, { notification });
});

it('알림 링크의 이동이 대기 중이면 링크 내용을 유지하며 이동 상태를 알린다', () => {
	const notification = createNotification();
	const onRead = vi.fn();
	const { rerender } = render(<NotificationCommentContent notification={notification} onRead={onRead} />);

	expect(screen.getByRole('status')).toBeEmptyDOMElement();
	linkStatus.pending = true;
	rerender(<NotificationCommentContent notification={notification} onRead={onRead} />);

	expect(screen.getByRole('status')).toHaveTextContent('게시글로 이동 중');
	expect(screen.getByRole('link', { name: `${notification.post.title} 게시글의 댓글 보기` })).toHaveTextContent(
		notification.comment.content,
	);

	linkStatus.pending = false;
	rerender(<NotificationCommentContent notification={notification} onRead={onRead} />);
	expect(screen.getByRole('status')).toBeEmptyDOMElement();
});
