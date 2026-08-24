import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

import type {
	EditorDocument,
	PostWriteInitialData,
	PublicationSettings,
} from '@/features/post-write/model/post-publication';

import PostWriteLoader from './PostWriteLoader';

interface WorkspaceMockProps {
	initialDocument?: EditorDocument;
	initialPublicationSettings?: PublicationSettings;
}

interface InitialDataQueryOptionsMock {
	postId: number;
	isEnabled: boolean;
}

interface InitialDataQueryResultMock {
	isPending: boolean;
	isError: boolean;
	data?: PostWriteInitialData;
}

const { searchParamsGetMock, usePostWriteInitialDataMock } = vi.hoisted(() => ({
	searchParamsGetMock: vi.fn(),
	usePostWriteInitialDataMock: vi.fn<(options: InitialDataQueryOptionsMock) => InitialDataQueryResultMock>(),
}));

vi.mock('next/navigation', () => ({
	useSearchParams: () => ({ get: searchParamsGetMock }),
}));

vi.mock('@/features/post-write/hooks/use-post-write-initial-data', () => ({
	usePostWriteInitialData: usePostWriteInitialDataMock,
}));

vi.mock('@/features/post-write/ui/PostWriteAccessGuard', () => ({
	default: ({ authorId, children }: { authorId: number; children: React.ReactNode }) => (
		<div>
			<p>접근 가드 작성자 {authorId}</p>
			{children}
		</div>
	),
}));

vi.mock('./PostWriteWorkspace', () => ({
	default: ({ initialDocument, initialPublicationSettings }: WorkspaceMockProps) => (
		<div>
			<p>글쓰기 워크스페이스</p>
			{initialDocument === undefined ? null : (
				<>
					<p>{initialDocument.title}</p>
					<p>본문 블록 {initialDocument.blocks.length}개</p>
				</>
			)}
			{initialPublicationSettings === undefined ? null : (
				<>
					<p>카테고리 {initialPublicationSettings.category}</p>
					<p>블로그 {initialPublicationSettings.blog?.name}</p>
					<p>썸네일 {initialPublicationSettings.representativeImageUrl}</p>
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

const initialData: PostWriteInitialData = {
	authorId: 7,
	document: initialDocument,
	settings: {
		category: 'DAILY',
		blog: { id: 3, slug: 'author', name: '작성자 블로그' },
		representativeImage: null,
		representativeImageUrl: 'posts/existing-thumbnail.png',
	},
};

describe('PostWriteLoader', () => {
	beforeEach(() => {
		searchParamsGetMock.mockReset();
		usePostWriteInitialDataMock.mockReset();
		searchParamsGetMock.mockReturnValue(null);
		usePostWriteInitialDataMock.mockReturnValue({ isPending: false, isError: false, data: undefined });
	});

	it('postId가 없으면 새 글 workspace를 바로 렌더링한다', () => {
		render(<PostWriteLoader />);

		expect(screen.getByText('글쓰기 워크스페이스')).toBeInTheDocument();
		expect(usePostWriteInitialDataMock).toHaveBeenCalledWith(expect.objectContaining({ postId: 0, isEnabled: false }));
	});

	it('올바르지 않은 postId이면 상세조회를 실행하지 않고 오류를 안내한다', () => {
		searchParamsGetMock.mockReturnValue('post-31');

		render(<PostWriteLoader />);

		expect(screen.getByRole('alert')).toHaveTextContent('올바르지 않은 게시글 ID입니다.');
		expect(screen.queryByText('글쓰기 워크스페이스')).not.toBeInTheDocument();
		expect(usePostWriteInitialDataMock).toHaveBeenCalledWith(expect.objectContaining({ postId: 0, isEnabled: false }));
	});

	it('게시글 상세조회 중에는 pending 상태를 보여 준다', () => {
		searchParamsGetMock.mockReturnValue('31');
		usePostWriteInitialDataMock.mockReturnValue({ isPending: true, isError: false, data: undefined });

		render(<PostWriteLoader />);

		expect(screen.getByRole('status')).toHaveTextContent('게시글을 불러오고 있어요.');
		expect(screen.queryByText('글쓰기 워크스페이스')).not.toBeInTheDocument();
	});

	it('게시글 상세조회에 실패하면 오류를 안내한다', () => {
		searchParamsGetMock.mockReturnValue('31');
		usePostWriteInitialDataMock.mockReturnValue({ isPending: false, isError: true, data: undefined });

		render(<PostWriteLoader />);

		expect(screen.getByRole('alert')).toHaveTextContent('게시글을 불러오지 못했습니다.');
		expect(screen.queryByText('글쓰기 워크스페이스')).not.toBeInTheDocument();
	});

	it('게시글 상세조회 결과의 문서와 게시 설정을 workspace에 전달한다', () => {
		searchParamsGetMock.mockReturnValue('31');
		usePostWriteInitialDataMock.mockReturnValue({
			isPending: false,
			isError: false,
			data: initialData,
		});

		render(<PostWriteLoader />);

		expect(screen.getByText('불러온 제목')).toBeInTheDocument();
		expect(screen.getByText('본문 블록 1개')).toBeInTheDocument();
		expect(screen.getByText('카테고리 DAILY')).toBeInTheDocument();
		expect(screen.getByText('블로그 작성자 블로그')).toBeInTheDocument();
		expect(screen.getByText('썸네일 posts/existing-thumbnail.png')).toBeInTheDocument();
		expect(screen.getByText('접근 가드 작성자 7')).toBeInTheDocument();
		expect(usePostWriteInitialDataMock).toHaveBeenCalledWith(expect.objectContaining({ postId: 31, isEnabled: true }));
	});
});
