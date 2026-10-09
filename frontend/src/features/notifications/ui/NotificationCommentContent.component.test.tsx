import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import type * as NextLinkModule from 'next/link';

import { createNotification } from '@/test/fixtures/notification';

import NotificationCommentContent from './NotificationCommentContent';

const linkStatus = vi.hoisted(() => ({ pending: false }));

vi.mock('next/link', async (importOriginal) => {
	const actual = await importOriginal<typeof NextLinkModule>();
	return { ...actual, useLinkStatus: () => ({ pending: linkStatus.pending }) };
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
