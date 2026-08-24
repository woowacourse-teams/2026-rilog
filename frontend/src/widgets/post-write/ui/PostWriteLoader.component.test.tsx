import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

import type { EditorDocument } from '@/features/post-write/model/post-publication';

import PostWriteLoader from './PostWriteLoader';

interface WorkspaceMockProps {
	initialDocument?: EditorDocument;
}

interface InitialDocumentQueryOptionsMock {
	postId: number;
	isEnabled: boolean;
}

interface InitialDocumentQueryResultMock {
	isPending: boolean;
	isError: boolean;
	data?: EditorDocument;
}

const { searchParamsGetMock, usePostWriteInitialDocumentMock } = vi.hoisted(() => ({
	searchParamsGetMock: vi.fn(),
	usePostWriteInitialDocumentMock:
		vi.fn<(options: InitialDocumentQueryOptionsMock) => InitialDocumentQueryResultMock>(),
}));

vi.mock('next/navigation', () => ({
	useSearchParams: () => ({ get: searchParamsGetMock }),
}));

vi.mock('@/features/post-write/hooks/use-post-write-initial-document', () => ({
	usePostWriteInitialDocument: usePostWriteInitialDocumentMock,
}));

vi.mock('./PostWriteWorkspace', () => ({
	default: ({ initialDocument }: WorkspaceMockProps) => (
		<div>
			<p>글쓰기 워크스페이스</p>
			{initialDocument === undefined ? null : (
				<>
					<p>{initialDocument.title}</p>
					<p>본문 블록 {initialDocument.blocks.length}개</p>
				</>
			)}
		</div>
	),
}));

const initialBlock: Block = {
	id: 'paragraph',
	type: 'paragraph',
	props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
	content: [],
	children: [],
};

const initialDocument: EditorDocument = {
	title: '불러온 제목',
	blocks: [initialBlock],
};

describe('PostWriteLoader', () => {
	beforeEach(() => {
		searchParamsGetMock.mockReset();
		usePostWriteInitialDocumentMock.mockReset();
		searchParamsGetMock.mockReturnValue(null);
		usePostWriteInitialDocumentMock.mockReturnValue({ isPending: false, isError: false, data: undefined });
	});

	it('postId가 없으면 새 글 workspace를 바로 렌더링한다', () => {
		render(<PostWriteLoader />);

		expect(screen.getByText('글쓰기 워크스페이스')).toBeInTheDocument();
		expect(usePostWriteInitialDocumentMock).toHaveBeenCalledWith(
			expect.objectContaining({ postId: 0, isEnabled: false }),
		);
	});

	it('올바르지 않은 postId이면 상세조회를 실행하지 않고 오류를 안내한다', () => {
		searchParamsGetMock.mockReturnValue('post-31');

		render(<PostWriteLoader />);

		expect(screen.getByRole('alert')).toHaveTextContent('올바르지 않은 게시글 ID입니다.');
		expect(screen.queryByText('글쓰기 워크스페이스')).not.toBeInTheDocument();
		expect(usePostWriteInitialDocumentMock).toHaveBeenCalledWith(
			expect.objectContaining({ postId: 0, isEnabled: false }),
		);
	});

	it('게시글 상세조회 중에는 pending 상태를 보여 준다', () => {
		searchParamsGetMock.mockReturnValue('31');
		usePostWriteInitialDocumentMock.mockReturnValue({ isPending: true, isError: false, data: undefined });

		render(<PostWriteLoader />);

		expect(screen.getByRole('status')).toHaveTextContent('게시글을 불러오고 있어요.');
		expect(screen.queryByText('글쓰기 워크스페이스')).not.toBeInTheDocument();
	});

	it('게시글 상세조회에 실패하면 오류를 안내한다', () => {
		searchParamsGetMock.mockReturnValue('31');
		usePostWriteInitialDocumentMock.mockReturnValue({ isPending: false, isError: true, data: undefined });

		render(<PostWriteLoader />);

		expect(screen.getByRole('alert')).toHaveTextContent('게시글을 불러오지 못했습니다.');
		expect(screen.queryByText('글쓰기 워크스페이스')).not.toBeInTheDocument();
	});

	it('게시글 상세조회 결과를 title과 body 초기값으로 workspace에 전달한다', () => {
		searchParamsGetMock.mockReturnValue('31');
		usePostWriteInitialDocumentMock.mockReturnValue({
			isPending: false,
			isError: false,
			data: initialDocument,
		});

		render(<PostWriteLoader />);

		expect(screen.getByText('불러온 제목')).toBeInTheDocument();
		expect(screen.getByText('본문 블록 1개')).toBeInTheDocument();
		expect(usePostWriteInitialDocumentMock).toHaveBeenCalledWith(
			expect.objectContaining({ postId: 31, isEnabled: true }),
		);
	});
});
