import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EditorDocument } from '@/features/post-write/model/post-publication';

import DraftPostLoader from './DraftPostLoader';

interface DraftInitialDocumentQueryResultMock {
	isPending: boolean;
	isError: boolean;
	data?: EditorDocument;
	refetch: () => void;
}

const { useDraftInitialDocumentMock } = vi.hoisted(() => ({
	useDraftInitialDocumentMock: vi.fn<() => DraftInitialDocumentQueryResultMock>(),
}));

vi.mock('@/features/post-write/hooks/use-draft-initial-document', () => ({
	useDraftInitialDocument: useDraftInitialDocumentMock,
}));

vi.mock('@/features/analytics/ui/ContentLoadFailureTracker', () => ({
	default: ({ surface, loadPhase }: { surface: string; loadPhase: string }) => (
		<p>{`로딩 실패 추적: ${surface}/${loadPhase}`}</p>
	),
}));

vi.mock('./DraftPostController', () => ({
	default: ({ draftId, initialDocument }: { draftId: number; initialDocument: EditorDocument }) => (
		<div>
			<p>임시저장 게시글 {draftId}</p>
			<p>{initialDocument.title}</p>
			<p>본문 블록 {initialDocument.blocks.length}개</p>
		</div>
	),
}));

describe('DraftPostLoader', () => {
	beforeEach(() => {
		useDraftInitialDocumentMock.mockReset();
	});

	it('상세조회 중에는 loading 상태를 보여 준다', () => {
		useDraftInitialDocumentMock.mockReturnValue({
			isPending: true,
			isError: false,
			refetch: vi.fn(),
		});

		render(<DraftPostLoader draftId={42} />);

		expect(screen.getByRole('status')).toHaveTextContent('임시저장 글을 불러오고 있어요.');
	});

	it('상세조회 실패 시 오류를 안내하고 다시 조회할 수 있다', async () => {
		const user = userEvent.setup();
		const refetch = vi.fn();
		useDraftInitialDocumentMock.mockReturnValue({
			isPending: false,
			isError: true,
			refetch,
		});

		render(<DraftPostLoader draftId={42} />);

		expect(screen.getByRole('alert')).toHaveTextContent('임시저장 글을 불러오지 못했습니다.');
		expect(screen.getByText('로딩 실패 추적: post_editor/draft_initial_data')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '다시 시도' }));
		expect(refetch).toHaveBeenCalledOnce();
	});

	it('상세조회 결과를 임시저장 controller의 초기 문서로 전달한다', () => {
		useDraftInitialDocumentMock.mockReturnValue({
			isPending: false,
			isError: false,
			data: { title: '불러온 제목', blocks: [] },
			refetch: vi.fn(),
		});

		render(<DraftPostLoader draftId={42} />);

		expect(screen.getByText('임시저장 게시글 42')).toBeInTheDocument();
		expect(screen.getByText('불러온 제목')).toBeInTheDocument();
		expect(screen.getByText('본문 블록 0개')).toBeInTheDocument();
		expect(useDraftInitialDocumentMock).toHaveBeenCalledWith({ draftId: 42, isEnabled: true });
	});
});
