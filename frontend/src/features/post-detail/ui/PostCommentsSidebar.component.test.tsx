import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import PostCommentsSidebar from './PostCommentsSidebar';

const THREADS: InlineCommentThreadModel[] = [
	{
		blockId: 'block-1',
		anchor: {
			anchorId: 1,
			range: { startOffset: 0, endOffset: 4 },
			selectedText: '활성 인용문',
			state: 'ACTIVE',
			comments: [
				{
					commentId: 1,
					content: '첫 번째 댓글',
					author: {
						userId: 1,
						nickname: '작성자',
						slug: 'author',
						profileImageUrl: null,
						isAuthor: true,
						isBlogMember: true,
					},
					canEdit: true,
					canDelete: true,
					createdAt: '2026-09-17T10:20:00',
					updatedAt: '2026-09-17T10:20:00',
				},
			],
		},
	},
	{
		blockId: 'block-1',
		anchor: {
			anchorId: 2,
			range: { startOffset: 5, endOffset: 9 },
			selectedText: '오래된 인용문',
			state: 'OUTDATED',
			comments: [
				{
					commentId: 2,
					content: '두 번째 댓글',
					author: {
						userId: 2,
						nickname: '댓글러',
						slug: 'member',
						profileImageUrl: null,
						isAuthor: false,
						isBlogMember: true,
					},
					canEdit: false,
					canDelete: false,
					createdAt: '2026-09-18T10:20:00',
					updatedAt: '2026-09-18T10:20:00',
				},
			],
		},
	},
];

describe('PostCommentsSidebar', () => {
	it('인용과 댓글 목록, 하단 댓글 입력을 표시한다', () => {
		render(<PostCommentsSidebar open threads={THREADS} onClose={vi.fn()} onNavigate={vi.fn()} />);

		expect(screen.getByRole('dialog', { name: '댓글 2' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: '“활성 인용문” 댓글' })).toBeInTheDocument();
		expect(screen.getByRole('article', { name: '작성자님의 댓글' })).toHaveTextContent('첫 번째 댓글');
		expect(screen.getByText('작성자', { selector: 'span' })).toBeInTheDocument();
		expect(screen.queryByText('멤버')).not.toBeInTheDocument();
		expect(screen.getAllByText('2026.09.17 10:20')).not.toHaveLength(0);
		expect(screen.getByText('OUTDATED')).toBeInTheDocument();
		expect(screen.getAllByRole('separator')).toHaveLength(2);
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveAttribute('placeholder', '댓글을 입력하세요.');
	});

	it('ACTIVE 인용만 이동할 수 있고 닫기 동작을 전달한다', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onNavigate = vi.fn();
		render(<PostCommentsSidebar open threads={THREADS} onClose={onClose} onNavigate={onNavigate} />);

		await user.click(screen.getByRole('button', { name: '인용문으로 이동: 활성 인용문' }));
		expect(onNavigate).toHaveBeenCalledWith(THREADS[0]);
		expect(screen.queryByRole('button', { name: '인용문으로 이동: 오래된 인용문' })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '댓글 사이드바 닫기' }));
		const dialog = screen.getByRole('dialog', { name: '댓글 2' });
		fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
		expect(onClose).toHaveBeenCalledTimes(2);
	});
});
