import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DraftListModal from './DraftListModal';

const defaultProps = {
	open: true,
	draftPosts: [],
	onClose: vi.fn(),
	onDelete: vi.fn(),
};

describe('DraftListModal', () => {
	it('목록을 불러오는 동안 loading 상태를 알린다', () => {
		render(<DraftListModal {...defaultProps} isPending />);

		expect(screen.getByRole('status')).toHaveTextContent('임시 저장된 글을 불러오는 중...');
	});

	it('빈 목록을 안내한다', () => {
		render(<DraftListModal {...defaultProps} />);

		expect(screen.getByRole('status')).toHaveTextContent('임시 저장된 글이 없어요.');
	});

	it('목록 조회 실패를 알리고 다시 조회할 수 있다', async () => {
		const user = userEvent.setup();
		const onRetry = vi.fn();
		render(<DraftListModal {...defaultProps} isError onRetry={onRetry} />);

		expect(screen.getByRole('alert')).toHaveTextContent('임시 저장된 글을 불러오지 못했어요.');
		await user.click(screen.getByRole('button', { name: '다시 시도' }));
		expect(onRetry).toHaveBeenCalledOnce();
	});

	it('다음 페이지가 있으면 사용자가 목록을 더 불러올 수 있다', async () => {
		const user = userEvent.setup();
		const onLoadMore = vi.fn();
		render(
			<DraftListModal
				{...defaultProps}
				draftPosts={[{ id: 42, title: '작성 중인 글', savedAt: '2026-08-27T10:29:46.466Z' }]}
				hasNextPage
				onLoadMore={onLoadMore}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '더 보기' }));
		expect(onLoadMore).toHaveBeenCalledOnce();
	});

	it('목록 제목을 임시저장 상세 작성 경로로 연결한다', () => {
		render(
			<DraftListModal
				{...defaultProps}
				draftPosts={[{ id: 42, title: '작성 중인 글', savedAt: '2026-08-27T10:29:46.466Z' }]}
			/>,
		);

		expect(screen.getByRole('link', { name: /작성 중인 글/ })).toHaveAttribute('href', '/write?draftId=42');
	});
});
