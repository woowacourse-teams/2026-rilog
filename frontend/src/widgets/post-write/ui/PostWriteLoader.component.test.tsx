import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

import type {
	EditorDocument,
	PostWriteInitialData,
	PublicationSettings,
} from '@/features/post-write/model/post-publication';

import PostWriteLoader from './PostWriteLoader';

interface ControllerMockProps {
	postId: number;
	draftId: number;
	initialDocument?: EditorDocument;
	initialPublicationSettings?: PublicationSettings;
}

interface NewPostControllerMockProps {
	onDraftPromoted?: (draftId: number) => void;
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

const {
	draftControllerUnmountedMock,
	editControllerUnmountedMock,
	newControllerUnmountedMock,
	searchParamsGetMock,
	useDraftInitialDocumentMock,
	usePostWriteInitialDataMock,
} = vi.hoisted(() => ({
	draftControllerUnmountedMock: vi.fn(),
	editControllerUnmountedMock: vi.fn(),
	newControllerUnmountedMock: vi.fn(),
	searchParamsGetMock: vi.fn<(name: string) => string | null>(),
	useDraftInitialDocumentMock: vi.fn(),
	usePostWriteInitialDataMock: vi.fn<(options: InitialDataQueryOptionsMock) => InitialDataQueryResultMock>(),
}));

vi.mock('next/navigation', () => ({
	useSearchParams: () => ({ get: searchParamsGetMock }),
}));

vi.mock('@/features/post-write/hooks/use-post-write-initial-data', () => ({
	usePostWriteInitialData: usePostWriteInitialDataMock,
}));

vi.mock('@/features/post-write/hooks/use-draft-initial-document', () => ({
	useDraftInitialDocument: useDraftInitialDocumentMock,
}));

vi.mock('@/features/post-write/ui/PostWriteAccessGuard', () => ({
	default: ({ authorId, children }: { authorId: number; children: React.ReactNode }) => (
		<div>
			<p>접근 가드 작성자 {authorId}</p>
			{children}
		</div>
	),
}));

vi.mock('./NewPostController', async () => {
	const { useEffect } = await import('react');

	function MockNewPostController({ onDraftPromoted }: NewPostControllerMockProps) {
		useEffect(
			() => () => {
				newControllerUnmountedMock();
			},
			[],
		);

		return (
			<div>
				<p>새 글 컨트롤러</p>
				<button type="button" onClick={() => onDraftPromoted?.(123)}>
					현재 글 임시저장 완료
				</button>
			</div>
		);
	}

	return {
		default: MockNewPostController,
	};
});

vi.mock('./DraftPostController', async () => {
	const { useEffect } = await import('react');

	function MockDraftPostController({ draftId }: Pick<ControllerMockProps, 'draftId'>) {
		useEffect(
			() => () => {
				draftControllerUnmountedMock(draftId);
			},
			[draftId],
		);

		return <p>임시저장 게시글 {draftId}</p>;
	}

	return {
		default: MockDraftPostController,
	};
});

vi.mock('./EditPostController', async () => {
	const { useEffect } = await import('react');

	function MockEditPostController({
		postId,
		initialDocument,
		initialPublicationSettings,
	}: Omit<ControllerMockProps, 'draftId'>) {
		useEffect(
			() => () => {
				editControllerUnmountedMock(postId);
			},
			[postId],
		);

		return (
			<div>
				<p>수정 게시글 {postId}</p>
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
		);
	}

	return {
		default: MockEditPostController,
	};
});

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
		draftControllerUnmountedMock.mockReset();
		editControllerUnmountedMock.mockReset();
		newControllerUnmountedMock.mockReset();
		searchParamsGetMock.mockReset();
		useDraftInitialDocumentMock.mockReset();
		usePostWriteInitialDataMock.mockReset();
		searchParamsGetMock.mockReturnValue(null);
		useDraftInitialDocumentMock.mockReturnValue({
			isPending: false,
			isError: false,
			data: { title: '', blocks: [] },
			refetch: vi.fn(),
		});
		usePostWriteInitialDataMock.mockReturnValue({ isPending: false, isError: false, data: undefined });
	});

	it('postId가 없으면 새 글 workspace를 바로 렌더링한다', () => {
		render(<PostWriteLoader />);

		expect(screen.getByText('새 글 컨트롤러')).toBeInTheDocument();
		expect(usePostWriteInitialDataMock).not.toHaveBeenCalled();
	});

	it('새 글 진입 후 URL에 draftId가 추가되어도 최초 controller를 교체하지 않는다', () => {
		const { rerender } = render(<PostWriteLoader />);
		expect(screen.getByText('새 글 컨트롤러')).toBeInTheDocument();

		fireEvent.click(screen.getByRole('button', { name: '현재 글 임시저장 완료' }));
		searchParamsGetMock.mockImplementation((name) => (name === 'draftId' ? '123' : null));
		rerender(<PostWriteLoader />);

		expect(screen.getByText('새 글 컨트롤러')).toBeInTheDocument();
		expect(screen.queryByText('임시저장 게시글 123')).not.toBeInTheDocument();
		expect(newControllerUnmountedMock).not.toHaveBeenCalled();
	});

	it('새 글 작성 중 기존 draft URL로 이동하면 draft controller로 전환한다', () => {
		const { rerender } = render(<PostWriteLoader />);

		expect(screen.getByText('새 글 컨트롤러')).toBeInTheDocument();
		searchParamsGetMock.mockImplementation((name) => (name === 'draftId' ? '42' : null));
		rerender(<PostWriteLoader />);

		expect(screen.getByText('임시저장 게시글 42')).toBeInTheDocument();
		expect(screen.queryByText('새 글 컨트롤러')).not.toBeInTheDocument();
		expect(newControllerUnmountedMock).toHaveBeenCalledOnce();
	});

	it('기존 임시저장 중 다른 draftId URL로 이동하면 기존 controller를 remount한다', () => {
		searchParamsGetMock.mockImplementation((name) => (name === 'draftId' ? '41' : null));
		const { rerender } = render(<PostWriteLoader />);

		expect(screen.getByText('임시저장 게시글 41')).toBeInTheDocument();
		searchParamsGetMock.mockImplementation((name) => (name === 'draftId' ? '42' : null));
		rerender(<PostWriteLoader />);

		expect(screen.getByText('임시저장 게시글 42')).toBeInTheDocument();
		expect(screen.queryByText('임시저장 게시글 41')).not.toBeInTheDocument();
		expect(draftControllerUnmountedMock).toHaveBeenCalledWith(41);
	});

	it('게시글 수정 중 새 글 URL로 이동하면 새 작성 controller로 전환한다', () => {
		searchParamsGetMock.mockImplementation((name) => (name === 'postId' ? '31' : null));
		usePostWriteInitialDataMock.mockReturnValue({ isPending: false, isError: false, data: initialData });
		const { rerender } = render(<PostWriteLoader />);

		expect(screen.getByText('수정 게시글 31')).toBeInTheDocument();
		searchParamsGetMock.mockReturnValue(null);
		rerender(<PostWriteLoader />);

		expect(screen.getByText('새 글 컨트롤러')).toBeInTheDocument();
		expect(screen.queryByText('수정 게시글 31')).not.toBeInTheDocument();
		expect(editControllerUnmountedMock).toHaveBeenCalledWith(31);
	});

	it('게시글 수정 중 다른 postId URL로 이동하면 기존 controller를 remount한다', () => {
		searchParamsGetMock.mockImplementation((name) => (name === 'postId' ? '31' : null));
		usePostWriteInitialDataMock.mockReturnValue({ isPending: false, isError: false, data: initialData });
		const { rerender } = render(<PostWriteLoader />);

		expect(screen.getByText('수정 게시글 31')).toBeInTheDocument();
		searchParamsGetMock.mockImplementation((name) => (name === 'postId' ? '32' : null));
		rerender(<PostWriteLoader />);

		expect(screen.getByText('수정 게시글 32')).toBeInTheDocument();
		expect(screen.queryByText('수정 게시글 31')).not.toBeInTheDocument();
		expect(editControllerUnmountedMock).toHaveBeenCalledWith(31);
		expect(usePostWriteInitialDataMock).toHaveBeenLastCalledWith(
			expect.objectContaining({ postId: 32, isEnabled: true }),
		);
	});

	it('올바르지 않은 postId이면 상세조회를 실행하지 않고 오류를 안내한다', () => {
		searchParamsGetMock.mockImplementation((name) => (name === 'postId' ? 'post-31' : null));

		render(<PostWriteLoader />);

		expect(screen.getByRole('alert')).toHaveTextContent('올바르지 않은 게시글 ID입니다.');
		expect(screen.queryByText('새 글 컨트롤러')).not.toBeInTheDocument();
		expect(usePostWriteInitialDataMock).not.toHaveBeenCalled();
	});

	it('게시글 상세조회 중에는 pending 상태를 보여 준다', () => {
		searchParamsGetMock.mockImplementation((name) => (name === 'postId' ? '31' : null));
		usePostWriteInitialDataMock.mockReturnValue({ isPending: true, isError: false, data: undefined });

		render(<PostWriteLoader />);

		expect(screen.getByRole('status')).toHaveTextContent('게시글을 불러오고 있어요.');
		expect(screen.queryByText('새 글 컨트롤러')).not.toBeInTheDocument();
	});

	it('게시글 상세조회에 실패하면 오류를 안내한다', () => {
		searchParamsGetMock.mockImplementation((name) => (name === 'postId' ? '31' : null));
		usePostWriteInitialDataMock.mockReturnValue({ isPending: false, isError: true, data: undefined });

		render(<PostWriteLoader />);

		expect(screen.getByRole('alert')).toHaveTextContent('게시글을 불러오지 못했습니다.');
		expect(screen.queryByText('새 글 컨트롤러')).not.toBeInTheDocument();
	});

	it('게시글 상세조회 결과의 문서와 게시 설정을 workspace에 전달한다', () => {
		searchParamsGetMock.mockImplementation((name) => (name === 'postId' ? '31' : null));
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
		expect(screen.getByText('수정 게시글 31')).toBeInTheDocument();
		expect(usePostWriteInitialDataMock).toHaveBeenCalledWith(expect.objectContaining({ postId: 31, isEnabled: true }));
	});

	it('draftId가 있으면 draft API 연결 전의 임시저장 workflow를 렌더링한다', () => {
		searchParamsGetMock.mockImplementation((name) => (name === 'draftId' ? '42' : null));

		render(<PostWriteLoader />);

		expect(screen.getByText('임시저장 게시글 42')).toBeInTheDocument();
		expect(usePostWriteInitialDataMock).not.toHaveBeenCalled();
	});

	it('postId와 draftId를 함께 사용하면 모호한 URL을 거부한다', () => {
		searchParamsGetMock.mockImplementation((name) => (name === 'postId' ? '31' : '42'));

		render(<PostWriteLoader />);

		expect(screen.getByRole('alert')).toHaveTextContent('게시글 ID와 임시저장 ID를 함께 사용할 수 없습니다.');
	});
});
