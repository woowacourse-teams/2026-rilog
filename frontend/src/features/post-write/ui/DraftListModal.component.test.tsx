import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DraftListModal from './DraftListModal';

const { recordEditorEntryContextMock } = vi.hoisted(() => ({
	recordEditorEntryContextMock: vi.fn(),
}));

vi.mock('@/features/analytics/lib/editor-entry-context', () => ({
	recordEditorEntryContext: recordEditorEntryContextMock,
}));

const defaultProps = {
	open: true,
	draftPosts: [],
	onClose: vi.fn(),
	onDelete: vi.fn(),
};

describe('DraftListModal', () => {
	beforeEach(() => recordEditorEntryContextMock.mockReset());

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

	it('임시저장 글로 이동하기 직전에 분석 진입 컨텍스트를 기록한다', async () => {
		const user = userEvent.setup();
		render(
			<DraftListModal
				{...defaultProps}
				draftPosts={[{ id: 42, title: '작성 중인 글', savedAt: '2026-08-27T10:29:46.466Z' }]}
			/>,
		);

		await user.click(screen.getByRole('link', { name: /작성 중인 글/ }));

		expect(recordEditorEntryContextMock).toHaveBeenCalledWith('draft_list');
	});

	it('현재 선택된 임시저장 글을 표시하고 링크로 제공하지 않는다', () => {
		render(
			<DraftListModal
				{...defaultProps}
				selectedDraftId={42}
				draftPosts={[
					{ id: 42, title: '현재 작성 중인 글', savedAt: '2026-08-27T10:29:46.466Z' },
					{ id: 43, title: '다른 임시저장 글', savedAt: '2026-08-26T10:29:46.466Z' },
				]}
			/>,
		);

		const currentBadge = screen.getByText('현재 작성 중');
		expect(currentBadge.previousElementSibling).toHaveTextContent('현재 작성 중인 글');
		expect(screen.getByText('현재 작성 중인 글').closest('[aria-current="page"]')).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: /현재 작성 중인 글/ })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '현재 작성 중인 글 임시 저장 글 삭제' })).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: /다른 임시저장 글/ })).toHaveAttribute('href', '/write?draftId=43');
		expect(screen.getByRole('button', { name: '다른 임시저장 글 임시 저장 글 삭제' })).toBeEnabled();
	});
});
