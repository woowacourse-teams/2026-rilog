import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Notification } from '@/domains/notification/model/notification';
import { createNotification } from '@/test/fixtures/notification';

import NotificationList from './NotificationList';

describe('NotificationList', () => {
	it('순서가 섞인 알림을 최신순으로 표시하고 입력 순서는 보존한다', () => {
		const oldest = createNotification({ id: 1, createdAt: '2026-10-01T00:00:00Z' });
		const newest = createNotification({ id: 2, createdAt: '2026-10-03T00:00:00Z' });
		const middle = createNotification({ id: 3, createdAt: '2026-10-02T00:00:00Z' });
		const notifications = [oldest, newest, middle];
		const original = [...notifications];
		render(<NotificationList status="success" notifications={notifications} onRead={vi.fn()} onReadAll={vi.fn()} />);

		expect(
			screen.getAllByRole('article').map((article) => within(article).getByRole('time').getAttribute('datetime')),
		).toEqual(['2026-10-03T00:00:00.000Z', '2026-10-02T00:00:00.000Z', '2026-10-01T00:00:00.000Z']);
		expect(notifications).toEqual(original);
	});

	it.each<{ type: Notification['type']; accessibleLabel: string }>([
		{ type: 'POST_COMMENT', accessibleLabel: '작성자님의 댓글 알림' },
		{ type: 'SELECTION_COMMENT', accessibleLabel: '작성자님의 댓글 알림' },
	])('$type 알림의 문맥과 본문을 표시하고 게시글 블로그로 연결한다', ({ type, accessibleLabel }) => {
		const notification = createNotification({ type });
		render(<NotificationList status="success" notifications={[notification]} onRead={vi.fn()} onReadAll={vi.fn()} />);

		const article = within(screen.getByRole('article', { name: accessibleLabel }));
		expect(article.getByRole('link', { name: `${notification.post.title} 게시글로 이동` })).toHaveAttribute(
			'href',
			'/@post-blog/posts/101',
		);
		expect(article.getByText(notification.anchor.content)).toBeInTheDocument();
		expect(article.getByText(notification.comment.content)).toBeInTheDocument();
		expect(screen.getByRole('article')).toHaveTextContent(
			type === 'POST_COMMENT'
				? `${notification.author.nickname} 님이 ${notification.post.title}에 댓글을 남겼어요.`
				: `${notification.author.nickname} 님이 나와 같은 문장에 댓글을 남겼어요.`,
		);
		if (type === 'SELECTION_COMMENT') {
			expect(article.getByRole('link')).toHaveTextContent(`${notification.post.title} 글에서`);
		}
	});

	it('수신한 알림이 없으면 빈 목록 안내를 표시한다', () => {
		render(<NotificationList status="success" notifications={[]} onRead={vi.fn()} onReadAll={vi.fn()} />);
		expect(screen.getByText('아직 도착한 알림이 없어요.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '모두 읽음' })).toBeDisabled();
	});

	it('로딩 중에는 접근 가능한 진행 상태를 표시한다', () => {
		render(<NotificationList status="loading" />);
		expect(screen.getByRole('status', { name: '알림 불러오는 중' })).toBeInTheDocument();
		expect(screen.queryByRole('article')).not.toBeInTheDocument();
	});

	it('조회 오류에서 다시 시도를 누르면 재시도 동작을 실행한다', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		render(<NotificationList status="error" onRetry={onRetry} />);
		expect(screen.getByRole('alert')).toHaveTextContent('알림을 불러오지 못했어요.');
		await user.click(screen.getByRole('button', { name: '다시 시도' }));
		expect(onRetry).toHaveBeenCalledOnce();
	});
});
