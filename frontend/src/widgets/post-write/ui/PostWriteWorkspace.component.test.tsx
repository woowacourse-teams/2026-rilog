import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

import type { PostEditorProps } from '@/features/post-write/model/post-editor';
import type { PublishPost } from '@/features/post-write/model/post-publication';
import type {
	DraftPublishRequest,
	DraftPublishResponse,
	DraftSaveRequest,
	DraftSaveResponse,
} from '@/shared/api/drafts/types';
import type { PostWriteRequest, PostWriteResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import type { UploadFileOptions } from '@/shared/api/uploads/types';

import DraftPostController from './DraftPostController';
import EditPostController from './EditPostController';
import NewPostController from './NewPostController';

type UploadFile = (request: UploadFileOptions) => Promise<{ objectKey: string }>;
type RequestPostPublication = (request: PostWriteRequest) => Promise<ApiResponse<PostWriteResponse>>;
type RequestDraftSave = (request: DraftSaveRequest) => Promise<ApiResponse<DraftSaveResponse>>;
type RequestDraftOverwrite = (variables: {
	draftId: number;
	request: DraftSaveRequest;
}) => Promise<ApiResponse<DraftSaveResponse>>;
type RequestDraftPublication = (variables: {
	draftId: number;
	request: DraftPublishRequest;
}) => Promise<ApiResponse<DraftPublishResponse>>;
type RequestDraftDelete = (postId: number) => Promise<Response>;
type RequestPostUpdate = (variables: {
	postId: number;
	request: PostWriteRequest;
}) => Promise<ApiResponse<PostWriteResponse>>;

const {
	postEditorOpenedMock,
	postDraftAbandonedMock,
	postPublishFailedMock,
	postPublishSettingsOpenedMock,
	postPublishStartedMock,
	postPublishValidationFailedMock,
	postPublishedMock,
	replaceMock,
	uploadRepresentativeImageMock,
	requestPostPublicationMock,
	requestDraftSaveMock,
	requestDraftOverwriteMock,
	requestDraftPublicationMock,
	requestDraftDeleteMock,
	resetDraftDeleteMock,
	requestPostUpdateMock,
	editorUnmountedMock,
} = vi.hoisted(() => ({
	postEditorOpenedMock: vi.fn(),
	postDraftAbandonedMock: vi.fn(),
	postPublishFailedMock: vi.fn(),
	postPublishSettingsOpenedMock: vi.fn(),
	postPublishStartedMock: vi.fn(),
	postPublishValidationFailedMock: vi.fn(),
	postPublishedMock: vi.fn(),
	replaceMock: vi.fn(),
	uploadRepresentativeImageMock: vi.fn<UploadFile>(),
	requestPostPublicationMock: vi.fn<RequestPostPublication>(),
	requestDraftSaveMock: vi.fn<RequestDraftSave>(),
	requestDraftOverwriteMock: vi.fn<RequestDraftOverwrite>(),
	requestDraftPublicationMock: vi.fn<RequestDraftPublication>(),
	requestDraftDeleteMock: vi.fn<RequestDraftDelete>(),
	resetDraftDeleteMock: vi.fn(),
	requestPostUpdateMock: vi.fn<RequestPostUpdate>(),
	editorUnmountedMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

vi.mock('@/features/analytics/model/events', () => ({
	analytics: {
		postEditorOpened: postEditorOpenedMock,
		postDraftAbandoned: postDraftAbandonedMock,
		postPublishFailed: postPublishFailedMock,
		postPublishSettingsOpened: postPublishSettingsOpenedMock,
		postPublishStarted: postPublishStartedMock,
		postPublishValidationFailed: postPublishValidationFailedMock,
		postPublished: postPublishedMock,
	},
}));

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: () => ({
		data: {
			status: 200,
			message: 'OK',
			data: { id: 10, slug: 'jetproc', nickname: '제트', profileImageUrl: 'profile/object-key.png' },
		},
	}),
}));

vi.mock('@/shared/api/users/queries/my-cologs-overview/use-query', () => ({
	useMyCologsOverviewQuery: () => ({
		data: {
			status: 200,
			message: 'OK',
			data: [
				{
					cologId: 20,
					slug: 'rilog-team',
					name: 'Rilog Team',
					profileImageUrl: 'cologs/rilog-team.png',
					chapters: [{ chapterId: 12, name: '제품 개발', order: 0 }],
				},
			],
		},
	}),
}));

vi.mock('@/shared/api/uploads/mutations/use-upload-file-mutation', () => ({
	useUploadFileMutation: () => ({ mutateAsync: uploadRepresentativeImageMock }),
}));

vi.mock('@/shared/api/posts/mutations/use-publish-post-mutation', () => ({
	usePublishPostMutation: () => ({ mutateAsync: requestPostPublicationMock }),
}));

vi.mock('@/shared/api/drafts/mutations/use-save-draft-mutation', () => ({
	useSaveDraftMutation: () => ({ mutateAsync: requestDraftSaveMock }),
}));

vi.mock('@/shared/api/drafts/mutations/use-overwrite-draft-mutation', () => ({
	useOverwriteDraftMutation: () => ({ mutateAsync: requestDraftOverwriteMock }),
}));

vi.mock('@/shared/api/drafts/mutations/use-publish-draft-mutation', () => ({
	usePublishDraftMutation: () => ({ mutateAsync: requestDraftPublicationMock }),
}));

vi.mock('@/shared/api/drafts/mutations/use-delete-draft-mutation', () => ({
	useDeleteDraftMutation: () => ({
		mutateAsync: requestDraftDeleteMock,
		reset: resetDraftDeleteMock,
		isPending: false,
		isError: false,
	}),
}));

vi.mock('@/features/post-write/hooks/use-post-draft-list', () => ({
	usePostDraftList: () => ({
		data: [
			{ id: 34, title: '디자인 시스템 도입 회고', savedAt: '2026-08-21T04:40:07.585624' },
			{ id: 37, title: 'TypeScript 타입 설계 회고', savedAt: '2026-08-20T04:40:07.585624' },
			{ id: 21, title: '접근성 개선 기록', savedAt: '2026-08-19T04:40:07.585624' },
			{ id: 4, title: 'Next.js 마이그레이션', savedAt: '2026-08-18T04:40:07.585624' },
		],
		isPending: false,
		isError: false,
		hasNextPage: false,
		isFetchingNextPage: false,
		isFetchNextPageError: false,
		refetch: vi.fn(),
		fetchNextPage: vi.fn(),
	}),
}));

vi.mock('@/features/post-write/hooks/use-post-publish-chapters', () => ({
	usePostPublishChapters: () => ({
		data: [{ value: '12', label: '제품 개발' }],
		isPending: false,
		isError: false,
		refetch: vi.fn(),
	}),
}));

vi.mock('@/shared/api/blogs/mutations/use-create-blog-chapter-mutation', () => ({
	useCreateBlogChapterMutation: () => ({
		mutateAsync: vi.fn(),
		reset: vi.fn(),
		isPending: false,
		isError: false,
		error: null,
	}),
}));

vi.mock('@/shared/api/posts/mutations/use-update-post-mutation', () => ({
	useUpdatePostMutation: () => ({ mutateAsync: requestPostUpdateMock }),
}));

beforeEach(() => {
	replaceMock.mockReset();
	postEditorOpenedMock.mockReset();
	postDraftAbandonedMock.mockReset();
	postPublishFailedMock.mockReset();
	postPublishSettingsOpenedMock.mockReset();
	postPublishStartedMock.mockReset();
	postPublishValidationFailedMock.mockReset();
	postPublishedMock.mockReset();
	uploadRepresentativeImageMock.mockReset();
	requestPostPublicationMock.mockReset();
	requestDraftSaveMock.mockReset();
	requestDraftOverwriteMock.mockReset();
	requestDraftPublicationMock.mockReset();
	requestDraftDeleteMock.mockReset();
	resetDraftDeleteMock.mockReset();
	requestPostUpdateMock.mockReset();
	editorUnmountedMock.mockReset();
	uploadRepresentativeImageMock.mockResolvedValue({ objectKey: 'posts/cover-object-key.png' });
	requestPostPublicationMock.mockResolvedValue({
		status: 201,
		message: '게시글 발행에 성공했습니다.',
		data: { postId: 77, slug: 'rilog-team' },
	});
	requestDraftSaveMock.mockResolvedValue({
		status: 201,
		message: '최초 임시저장에 성공했습니다.',
		data: { draftId: 123 },
	});
	requestDraftOverwriteMock.mockResolvedValue({
		status: 200,
		message: '임시저장을 덮어썼습니다.',
		data: { draftId: 123 },
	});
	requestDraftPublicationMock.mockResolvedValue({
		status: 200,
		message: '임시저장 글을 발행했습니다.',
		data: { postId: 77, slug: 'rilog-team' },
	});
	requestDraftDeleteMock.mockResolvedValue(new Response(null, { status: 204 }));
	requestPostUpdateMock.mockResolvedValue({
		status: 200,
		message: '게시글 수정에 성공했습니다.',
		data: { postId: 31, slug: 'personal-blog' },
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

const createParagraph = (text = ''): Block => ({
	id: 'paragraph',
	type: 'paragraph',
	props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
	content: text.length > 0 ? [{ type: 'text', text, styles: {} }] : [],
	children: [],
});

const createImage = (url: string): Block =>
	({
		id: 'image',
		type: 'image',
		props: { url },
		content: undefined,
		children: [],
	}) as unknown as Block;

function FakeEditor({ initialBlocks, onChange, onReady, ariaDescribedBy, ref }: PostEditorProps) {
	// BlockNote를 로드하지 않고도 부모와 주고받는 최신 본문 계약을 재현
	const blocksRef = useRef<Block[]>(initialBlocks ?? [createParagraph()]);
	// focus 위임 여부를 실제 textarea focus로 검증하기 위한 ref
	const editorRef = useRef<HTMLTextAreaElement>(null);

	useImperativeHandle(ref, () => ({
		focus: () => editorRef.current?.focus(),
	}));

	useEffect(() => {
		onReady(blocksRef.current);

		return () => {
			editorUnmountedMock();
		};
	}, [onReady]);

	return (
		<textarea
			ref={editorRef}
			aria-label="게시글 내용"
			aria-describedby={ariaDescribedBy}
			data-initial-block-count={initialBlocks?.length ?? 0}
			onChange={(event) => {
				blocksRef.current = [createParagraph(event.currentTarget.value)];
				onChange(blocksRef.current);
			}}
		/>
	);
}

function BodyImageUploadEditor({ onReady, uploadFile }: PostEditorProps) {
	const [uploadedImageUrl, setUploadedImageUrl] = useState('');

	useEffect(() => {
		onReady([createParagraph('이미지 본문')]);
	}, [onReady]);

	return (
		<>
			<button
				type="button"
				onClick={() => {
					void uploadFile(new File(['body-image'], 'body.png', { type: 'image/png' })).then(setUploadedImageUrl);
				}}
			>
				본문 이미지 업로드
			</button>
			<output>{uploadedImageUrl}</output>
		</>
	);
}

function BodyPdfUploadEditor({ onReady, uploadFile }: PostEditorProps) {
	const [uploadedFileUrl, setUploadedFileUrl] = useState('');

	useEffect(() => {
		onReady([createParagraph('PDF가 있는 본문')]);
	}, [onReady]);

	return (
		<>
			<button
				type="button"
				onClick={() => {
					void uploadFile(new File(['pdf'], 'document.pdf', { type: 'application/pdf' })).then(setUploadedFileUrl);
				}}
			>
				본문 PDF 업로드
			</button>
			<output>{uploadedFileUrl}</output>
		</>
	);
}

function FirstBodyImageEditor({ onReady }: PostEditorProps) {
	useEffect(() => {
		onReady([
			createParagraph('이미지가 있는 본문'),
			createImage('https://images.rilog.test/posts/first-body-image.png'),
		]);
	}, [onReady]);

	return null;
}

const fillValidPost = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), 'BlockNote 도입기');
	await user.type(screen.getByRole('textbox', { name: '게시글 내용' }), '오늘 배운 내용을 기록합니다.');
};

// 여러 발행 시나리오에서 반복되는 필수 Co-log 선택 동작
const selectFirstCoLog = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.click(screen.getByRole('radio', { name: '코로그' }));
	const select = screen.getByRole('combobox', { name: '코로그' });
	const firstCoLogOption = within(select).getAllByRole('option')[1];
	await user.selectOptions(select, firstCoLogOption);
	return firstCoLogOption.getAttribute('value')!;
};

describe('NewPostController', () => {
	it('최초 임시저장 후 같은 문서를 반환된 draftId로 덮어쓴다', async () => {
		const user = userEvent.setup();
		window.history.replaceState(null, '', '/write');
		render(<NewPostController editorComponent={FakeEditor} />);

		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '임시저장' }));

		await waitFor(() => expect(requestDraftSaveMock).toHaveBeenCalledOnce());
		expect(requestDraftSaveMock).toHaveBeenCalledWith({
			title: 'BlockNote 도입기',
			content: [createParagraph('오늘 배운 내용을 기록합니다.')],
		});
		expect(`${window.location.pathname}${window.location.search}`).toBe('/write?draftId=123');

		const saveButton = screen.getByRole('button', { name: '임시저장' });
		expect(saveButton).toBeDisabled();
		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), ' 수정');
		expect(saveButton).toBeEnabled();
		await user.click(screen.getByRole('button', { name: '임시저장' }));
		await waitFor(() => expect(requestDraftOverwriteMock).toHaveBeenCalledOnce());
		expect(requestDraftOverwriteMock).toHaveBeenCalledWith({
			draftId: 123,
			request: {
				title: 'BlockNote 도입기 수정',
				content: [createParagraph('오늘 배운 내용을 기록합니다.')],
			},
		});
		await waitFor(() => expect(saveButton).toBeDisabled());
	});

	it('전달받은 제목과 본문을 초기값으로 사용하고 dirty 상태로 취급하지 않는다', () => {
		const initialBlocks = [createParagraph('기존 본문')];
		render(
			<NewPostController
				editorComponent={FakeEditor}
				initialDocument={{ title: '기존 제목', blocks: initialBlocks }}
			/>,
		);

		expect(screen.getByRole('textbox', { name: '게시글 제목' })).toHaveValue('기존 제목');
		expect(screen.getByRole('textbox', { name: '게시글 내용' })).toHaveAttribute('data-initial-block-count', '1');

		const beforeUnloadEvent = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(beforeUnloadEvent);
		expect(beforeUnloadEvent.defaultPrevented).toBe(false);
	});

	it('최초 임시저장 후 draft workflow로 전환해도 현재 Editor를 유지하고 이후 저장은 draftId를 사용한다', async () => {
		const user = userEvent.setup();
		window.history.replaceState({ testMarker: 'preserved' }, '', '/write');
		const createDraft = vi.fn().mockResolvedValue({ draftId: 123 });
		const updateDraft = vi.fn().mockResolvedValue(undefined);
		render(<NewPostController editorComponent={FakeEditor} createDraft={createDraft} updateDraft={updateDraft} />);

		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '임시저장' }));

		await waitFor(() => expect(createDraft).toHaveBeenCalledOnce());
		expect(`${window.location.pathname}${window.location.search}`).toBe('/write?draftId=123');
		expect(window.history.state).toMatchObject({ testMarker: 'preserved' });
		expect(editorUnmountedMock).not.toHaveBeenCalled();
		expect(screen.getByRole('textbox', { name: '게시글 제목' })).toHaveValue('BlockNote 도입기');

		const saveButton = screen.getByRole('button', { name: '임시저장' });
		expect(saveButton).toBeDisabled();
		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), ' 수정');
		await user.click(screen.getByRole('button', { name: '임시저장' }));

		await waitFor(() => expect(updateDraft).toHaveBeenCalledOnce());
		expect(updateDraft.mock.calls[0]?.[0]).toBe(123);
		expect(editorUnmountedMock).not.toHaveBeenCalled();
		await waitFor(() => expect(saveButton).toBeDisabled());
	});

	it('불러온 임시저장 글을 현재 draftId로 덮어쓴다', async () => {
		const user = userEvent.setup();
		const blocks = [createParagraph('기존 임시저장 본문')];
		render(
			<DraftPostController
				draftId={42}
				editorComponent={FakeEditor}
				initialDocument={{ title: '기존 임시저장 제목', blocks }}
			/>,
		);

		const saveButton = screen.getByRole('button', { name: '임시저장' });
		expect(saveButton).toBeDisabled();
		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), ' 수정');
		expect(saveButton).toBeEnabled();
		await user.click(saveButton);

		await waitFor(() => expect(requestDraftOverwriteMock).toHaveBeenCalledOnce());
		expect(requestDraftOverwriteMock).toHaveBeenCalledWith({
			draftId: 42,
			request: { title: '기존 임시저장 제목 수정', content: blocks },
		});
		await waitFor(() => expect(saveButton).toBeDisabled());
	});

	it('임시저장 요청 중 저장 상태를 표시하고 저장, 목록, 발행 버튼을 비활성화한다', async () => {
		let resolveSave: ((response: ApiResponse<DraftSaveResponse>) => void) | undefined;
		requestDraftOverwriteMock.mockImplementationOnce(
			() =>
				new Promise<ApiResponse<DraftSaveResponse>>((resolve) => {
					resolveSave = resolve;
				}),
		);
		const user = userEvent.setup();
		render(
			<DraftPostController
				draftId={42}
				editorComponent={FakeEditor}
				initialDocument={{ title: '기존 임시저장 제목', blocks: [createParagraph('기존 본문')] }}
			/>,
		);
		const saveButton = screen.getByRole('button', { name: '임시저장' });
		const listButton = screen.getByRole('button', { name: '임시 저장된 글 4개 보기' });
		const publishButton = screen.getByRole('button', { name: '발행' });

		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), ' 수정');
		await user.click(saveButton);

		expect(screen.getByRole('status')).toHaveTextContent('저장 중...');
		expect(saveButton).toBeDisabled();
		expect(listButton).toBeDisabled();
		expect(publishButton).toBeDisabled();

		resolveSave?.({
			status: 200,
			message: '임시저장을 덮어썼습니다.',
			data: { draftId: 42 },
		});

		await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
		expect(saveButton).toBeDisabled();
		expect(listButton).toBeEnabled();
		expect(publishButton).toBeEnabled();
	});

	it('불러온 임시저장 글을 현재 draftId로 발행하고 게시글 상세로 이동한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		const blocks = [createParagraph('기존 임시저장 본문')];
		render(
			<DraftPostController
				draftId={42}
				editorComponent={FakeEditor}
				initialDocument={{ title: '기존 임시저장 제목', blocks }}
				navigate={navigate}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '발행' }));
		await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(requestDraftPublicationMock).toHaveBeenCalledOnce());
		expect(requestDraftPublicationMock).toHaveBeenCalledWith({
			draftId: 42,
			request: {
				slug: 'rilog-team',
				title: '기존 임시저장 제목',
				content: blocks,
				category: 'TECH',
				visibility: 'PUBLIC',
				thumbnailImageUrl: '/images/thumbnail-fallback.svg',
				chapterId: null,
			},
		});
		expect(requestPostPublicationMock).not.toHaveBeenCalled();
		expect(navigate).toHaveBeenCalledWith('/@rilog-team/posts/77');
	});

	it('최초 임시저장 후에는 반환된 draftId로 발행한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		render(<NewPostController editorComponent={FakeEditor} navigate={navigate} />);

		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '임시저장' }));
		await waitFor(() => expect(requestDraftSaveMock).toHaveBeenCalledOnce());

		await user.click(screen.getByRole('button', { name: '발행' }));
		await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(requestDraftPublicationMock).toHaveBeenCalledOnce());
		expect(requestDraftPublicationMock.mock.calls[0]?.[0].draftId).toBe(123);
		expect(requestPostPublicationMock).not.toHaveBeenCalled();
		expect(navigate).toHaveBeenCalledWith('/@rilog-team/posts/77');
	});

	it('현재 작성 중인 임시저장 글은 목록에서 선택 상태로 표시하고 다시 선택할 수 없게 한다', async () => {
		const user = userEvent.setup();
		render(
			<DraftPostController
				draftId={34}
				editorComponent={FakeEditor}
				initialDocument={{ title: '디자인 시스템 도입 회고', blocks: [createParagraph('본문')] }}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '임시 저장된 글 4개 보기' }));

		const draftListDialog = screen.getByRole('dialog', { name: '임시 저장된 글' });
		expect(within(draftListDialog).getByText('현재 작성 중')).toBeInTheDocument();
		expect(within(draftListDialog).queryByRole('link', { name: /디자인 시스템 도입 회고/ })).not.toBeInTheDocument();
		expect(
			within(draftListDialog).queryByRole('button', { name: '디자인 시스템 도입 회고 임시 저장 글 삭제' }),
		).not.toBeInTheDocument();
	});

	it('수정할 개인 게시글의 카테고리와 기존 썸네일을 게시 설정 초기값으로 유지한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', 'https://images.rilog.test');
		const user = userEvent.setup();
		const publishPost = vi.fn<PublishPost>().mockResolvedValue({ postId: '31', slug: 'personal-blog' });
		render(
			<EditPostController
				postId={31}
				editorComponent={FakeEditor}
				initialDocument={{ title: '기존 제목', blocks: [createParagraph('기존 본문')] }}
				initialPublicationSettings={{
					category: 'DAILY',
					blog: { type: 'RILOG', slug: 'personal-blog' },
					chapterId: 12,
					representativeImage: null,
					representativeImageUrl: 'posts/existing-thumbnail.png',
				}}
				publishPost={publishPost}
			/>,
		);

		expect(screen.queryByRole('button', { name: '임시저장' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /임시 저장된 글/ })).not.toBeInTheDocument();
		const publishButton = screen.getByRole('button', { name: '수정' });
		expect(publishButton).toBeDisabled();
		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), ' 수정');
		expect(publishButton).toBeEnabled();
		await user.click(publishButton);

		expect(screen.getByRole('combobox', { name: '카테고리' })).toHaveDisplayValue('일상');
		expect(screen.getByRole('radio', { name: '개인' })).toBeChecked();
		expect(screen.queryByRole('combobox', { name: '코로그' })).not.toBeInTheDocument();
		expect(screen.getByRole('img', { name: '게시글 대표 이미지 미리보기' })).toHaveAttribute(
			'src',
			'https://images.rilog.test/posts/existing-thumbnail.png',
		);

		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(publishPost).toHaveBeenCalledOnce());
		expect(publishPost.mock.calls[0]?.[0].settings).toMatchObject({
			category: 'DAILY',
			blog: { type: 'RILOG', slug: 'personal-blog' },
			representativeImage: null,
			representativeImageUrl: 'posts/existing-thumbnail.png',
		});
	});

	it('임시저장 글 발행도 현재 post published 계약으로 기록한다', async () => {
		const user = userEvent.setup();
		const publishDraft = vi.fn().mockResolvedValue({ postId: 'draft-42', slug: 'rilog-team' });
		render(
			<DraftPostController
				draftId={42}
				editorComponent={FakeEditor}
				initialDocument={{ title: '임시저장 제목', blocks: [createParagraph('임시저장 본문')] }}
				initialPublicationSettings={{
					category: 'DAILY',
					blog: { type: 'COLOG', id: 20, slug: 'rilog-team' },
					chapterId: null,
					representativeImage: null,
					representativeImageUrl: null,
				}}
				publishDraft={publishDraft}
			/>,
		);

		await user.click(screen.getByRole('button', { name: '발행' }));
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(publishDraft).toHaveBeenCalledWith(42, expect.any(Object)));
		expect(postPublishedMock).toHaveBeenCalledWith({
			postId: 'draft-42',
			ownerType: 'COLOG',
			category: 'DAILY',
			cologId: 20,
			imageSource: 'default',
			blockCountBucket: '1-5',
		});
	});

	it('진입 시 제목에 focus하고 Enter를 누르면 본문으로 이동한다', async () => {
		const user = userEvent.setup();
		render(<NewPostController editorComponent={FakeEditor} />);

		const titleField = screen.getByRole('textbox', { name: '게시글 제목' });
		expect(titleField).toHaveFocus();
		await user.type(titleField, '제목{enter}');
		expect(screen.getByRole('textbox', { name: '게시글 내용' })).toHaveFocus();
		expect(postEditorOpenedMock).toHaveBeenCalledOnce();
		expect(postEditorOpenedMock).toHaveBeenCalledWith({ entrySource: 'direct', availableBlogCount: 1 });
	});

	it('임시 저장 글 삭제를 취소하면 요청하지 않고 확인하면 선택한 postId로 삭제한다', async () => {
		const user = userEvent.setup();
		render(<NewPostController editorComponent={FakeEditor} />);

		await user.click(screen.getByRole('button', { name: '임시 저장된 글 4개 보기' }));
		const draftListDialog = screen.getByRole('dialog', { name: '임시 저장된 글' });
		const firstDeleteButton = within(draftListDialog).getByRole('button', {
			name: '디자인 시스템 도입 회고 임시 저장 글 삭제',
		});

		await user.click(firstDeleteButton);
		const deleteConfirmDialog = screen.getByRole('dialog', { name: '임시 저장 글을 삭제할까요?' });
		await user.click(within(deleteConfirmDialog).getByRole('button', { name: '취소' }));

		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '임시 저장 글을 삭제할까요?' })).not.toBeInTheDocument(),
		);
		expect(within(draftListDialog).getAllByRole('listitem')).toHaveLength(4);
		expect(requestDraftDeleteMock).not.toHaveBeenCalled();

		await user.click(firstDeleteButton);
		await user.click(
			within(screen.getByRole('dialog', { name: '임시 저장 글을 삭제할까요?' })).getByRole('button', {
				name: '삭제',
			}),
		);

		await waitFor(() => expect(requestDraftDeleteMock).toHaveBeenCalledWith(34));
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '임시 저장 글을 삭제할까요?' })).not.toBeInTheDocument(),
		);
	});

	it('빈 문서는 설정 모달을 열지 않고 첫 오류로 focus한다', async () => {
		const user = userEvent.setup();
		render(<NewPostController editorComponent={FakeEditor} />);

		await user.click(screen.getByRole('button', { name: '발행' }));

		expect(screen.queryByRole('dialog', { name: '게시 설정' })).not.toBeInTheDocument();
		expect(screen.getByText('제목을 입력해 주세요.')).toBeInTheDocument();
		const bodyError = screen.getByText('내용을 입력해 주세요.');
		const bodyField = screen.getByRole('textbox', { name: '게시글 내용' });
		expect(bodyField).toHaveAttribute('aria-describedby', bodyError.id);
		expect(screen.getByRole('textbox', { name: '게시글 제목' })).toHaveFocus();
		expect(postPublishValidationFailedMock).toHaveBeenCalledWith({ invalidFields: ['title', 'body'] });

		await user.type(bodyField, '본문');
		expect(bodyField).not.toHaveAttribute('aria-describedby');
	});

	it('제목만 입력한 문서는 본문 오류를 표시하고 에디터로 focus한다', async () => {
		const user = userEvent.setup();
		render(<NewPostController editorComponent={FakeEditor} />);

		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), '제목만 있는 글');
		await user.click(screen.getByRole('button', { name: '발행' }));

		expect(screen.queryByRole('dialog', { name: '게시 설정' })).not.toBeInTheDocument();
		expect(screen.queryByText('제목을 입력해 주세요.')).not.toBeInTheDocument();
		expect(screen.getByText('내용을 입력해 주세요.')).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '게시글 내용' })).toHaveFocus();
	});

	it('유효하지 않은 문서를 임시저장하면 오류를 표시하고 첫 오류 필드로 focus한다', async () => {
		const user = userEvent.setup();
		render(<NewPostController editorComponent={FakeEditor} />);

		await user.click(screen.getByRole('button', { name: '임시저장' }));

		expect(screen.getByText('제목을 입력해 주세요.')).toBeInTheDocument();
		expect(screen.getByText('내용을 입력해 주세요.')).toBeInTheDocument();
		const titleField = screen.getByRole('textbox', { name: '게시글 제목' });
		expect(titleField).toHaveFocus();

		await user.type(titleField, '임시 저장할 제목');
		await user.click(screen.getByRole('button', { name: '임시저장' }));

		expect(screen.queryByText('제목을 입력해 주세요.')).not.toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '게시글 내용' })).toHaveFocus();
	});

	it('내 블로그를 제외하고 소속 팀 블로그만 발행 대상으로 보여 준다', async () => {
		const user = userEvent.setup();
		render(<NewPostController editorComponent={FakeEditor} />);

		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		expect(postPublishSettingsOpenedMock).toHaveBeenCalledOnce();
		await user.click(screen.getByRole('radio', { name: '코로그' }));

		const cologSelect = screen.getByRole('combobox', { name: '코로그' });
		expect(within(cologSelect).queryByRole('option', { name: '내 블로그' })).not.toBeInTheDocument();
		expect(within(cologSelect).getByRole('option', { name: 'Rilog Team' })).toHaveValue('20');
	});

	it('본문 이미지를 스토리지에 업로드하고 완성된 URL을 에디터에 전달한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', 'https://images.rilog.test');
		uploadRepresentativeImageMock.mockResolvedValue({ objectKey: 'posts/body-image.png' });
		const user = userEvent.setup();
		render(<NewPostController editorComponent={BodyImageUploadEditor} />);

		await user.click(screen.getByRole('button', { name: '본문 이미지 업로드' }));

		expect(await screen.findByText('https://images.rilog.test/posts/body-image.png')).toBeInTheDocument();
		const uploadedBodyImage = uploadRepresentativeImageMock.mock.calls[0]?.[0];
		expect(uploadedBodyImage?.file.name).toBe('body.png');
		expect(uploadedBodyImage?.file.type).toBe('image/png');
		expect(uploadedBodyImage?.type).toBe('IMAGE');
	});

	it('본문의 PDF 파일을 범용 파일로 업로드하고 완성된 URL을 에디터에 전달한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', 'https://files.rilog.test');
		uploadRepresentativeImageMock.mockResolvedValue({ objectKey: 'posts/document.pdf' });
		const user = userEvent.setup();
		render(<NewPostController editorComponent={BodyPdfUploadEditor} />);

		await user.click(screen.getByRole('button', { name: '본문 PDF 업로드' }));

		expect(await screen.findByText('https://files.rilog.test/posts/document.pdf')).toBeInTheDocument();
		const uploadedBodyFile = uploadRepresentativeImageMock.mock.calls[0]?.[0];
		expect(uploadedBodyFile?.file.name).toBe('document.pdf');
		expect(uploadedBodyFile?.file.type).toBe('application/pdf');
		expect(uploadedBodyFile?.type).toBe('FILE');
	});

	it('모달을 닫았다 열어도 게시 설정을 유지하고 backdrop으로 닫히지 않는다', async () => {
		const user = userEvent.setup();
		render(<NewPostController editorComponent={FakeEditor} />);
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));

		const dialog = screen.getByRole('dialog', { name: '게시 설정' });
		expect(screen.queryByRole('button', { name: '모달 닫기' })).not.toBeInTheDocument();
		fireEvent.click(dialog);
		expect(dialog).toBeInTheDocument();

		await user.selectOptions(screen.getByRole('combobox', { name: '카테고리' }), 'DAILY');
		const selectedCoLogId = await selectFirstCoLog(user);
		await user.click(screen.getByRole('button', { name: '취소' }));
		await waitFor(() => expect(screen.queryByRole('dialog', { name: '게시 설정' })).not.toBeInTheDocument());
		await user.click(screen.getByRole('button', { name: '발행' }));

		expect(screen.getByRole('combobox', { name: '카테고리' })).toHaveDisplayValue('일상');
		expect(screen.getByRole('combobox', { name: '코로그' })).toHaveValue(selectedCoLogId);
	});

	it('선택한 대표 이미지를 유지하고 교체·제거·unmount 때 object URL을 해제한다', async () => {
		const createObjectUrl = vi
			.fn()
			.mockReturnValueOnce('blob:first-cover')
			.mockReturnValueOnce('blob:second-cover')
			.mockReturnValueOnce('blob:third-cover');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const user = userEvent.setup();
		const { unmount } = render(<NewPostController editorComponent={FakeEditor} />);
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));

		const thumbnailPreview = screen.getByRole('figure', { name: '게시글 썸네일 미리보기' });
		expect(within(thumbnailPreview).getByText('BlockNote 도입기')).toBeInTheDocument();
		await user.upload(screen.getByLabelText('이미지 선택'), new File(['first'], 'first.png', { type: 'image/png' }));
		expect(screen.getByRole('img', { name: '게시글 대표 이미지 미리보기' })).toHaveAttribute('src', 'blob:first-cover');

		await user.upload(screen.getByLabelText('이미지 변경'), new File(['second'], 'second.png', { type: 'image/png' }));
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:first-cover');
		await user.click(screen.getByRole('button', { name: '취소' }));
		await waitFor(() => expect(screen.queryByRole('dialog', { name: '게시 설정' })).not.toBeInTheDocument());
		await user.click(screen.getByRole('button', { name: '발행' }));
		expect(screen.getByRole('img', { name: '게시글 대표 이미지 미리보기' })).toHaveAttribute(
			'src',
			'blob:second-cover',
		);

		await user.click(screen.getByRole('button', { name: '이미지 제거' }));
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:second-cover');
		expect(screen.getByRole('img', { name: '게시글 대표 이미지 미리보기' })).toHaveAttribute(
			'src',
			'/images/thumbnail-fallback.svg',
		);

		await user.upload(screen.getByLabelText('이미지 선택'), new File(['third'], 'third.png', { type: 'image/png' }));

		unmount();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:third-cover');
		vi.unstubAllGlobals();
	});

	it('발행 중 중복 제출과 dismiss를 막고 성공한 상세 URL로 이동한다', async () => {
		const user = userEvent.setup();
		const historyBackSpy = vi.spyOn(window.history, 'back');
		historyBackSpy.mockClear();
		replaceMock.mockClear();
		let resolvePublish: ((value: { postId: string; slug: string }) => void) | undefined;
		const publishPost: PublishPost = vi.fn(
			() =>
				new Promise<{ postId: string; slug: string }>((resolve) => {
					resolvePublish = resolve;
				}),
		);
		render(<NewPostController editorComponent={FakeEditor} publishPost={publishPost} />);
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);
		expect(postPublishStartedMock).toHaveBeenCalledWith({
			ownerType: 'COLOG',
			category: 'IT',
			imageSource: 'default',
		});

		const dialog = screen.getByRole('dialog', { name: '게시 설정' });
		expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
		expect(screen.getAllByRole('button', { name: '발행' }).at(-1)).toBeDisabled();
		fireEvent.click(dialog);
		fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
		expect(dialog).toBeInTheDocument();
		expect(publishPost).toHaveBeenCalledOnce();

		resolvePublish?.({ postId: 'post/40', slug: 'rilog' });
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/@rilog/posts/post%2F40'));
		expect(postPublishedMock).toHaveBeenCalledWith(
			expect.objectContaining({
				postId: 'post/40',
				category: 'IT',
				cologId: 20,
				ownerType: 'COLOG',
				imageSource: 'default',
				blockCountBucket: '1-5',
			}),
		);
		const beforeUnloadEvent = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(beforeUnloadEvent);
		expect(beforeUnloadEvent.defaultPrevented).toBe(false);
		expect(historyBackSpy).not.toHaveBeenCalled();
		historyBackSpy.mockRestore();
	});

	it('개인 블로그를 선택하면 개인 slug와 analytics 대상 타입을 사용한다', async () => {
		const user = userEvent.setup();
		render(<NewPostController editorComponent={FakeEditor} />);
		await fillValidPost(user);

		await user.click(screen.getByRole('button', { name: '발행' }));
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(requestPostPublicationMock).toHaveBeenCalledOnce());
		expect(requestPostPublicationMock).toHaveBeenCalledWith(expect.objectContaining({ slug: 'jetproc' }));
		expect(postPublishStartedMock).toHaveBeenCalledWith({
			ownerType: 'RILOG',
			category: 'IT',
			imageSource: 'default',
		});
		expect(postPublishedMock).toHaveBeenCalledWith(
			expect.objectContaining({ postId: '77', ownerType: 'RILOG', cologId: null }),
		);
	});

	it('발행 결과의 게시글 ID가 잘못되면 모달과 이탈 보호를 유지한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		const publishPost = vi.fn<PublishPost>().mockResolvedValue({ postId: '   ', slug: 'rilog' });
		render(<NewPostController editorComponent={FakeEditor} publishPost={publishPost} navigate={navigate} />);
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		const dialog = screen.getByRole('dialog', { name: '게시 설정' });
		expect(await within(dialog).findByText('게시글 ID가 필요합니다.')).toBeInTheDocument();
		expect(navigate).not.toHaveBeenCalled();

		const beforeUnloadEvent = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(beforeUnloadEvent);
		expect(beforeUnloadEvent.defaultPrevented).toBe(true);
	});

	it('발행 실패 후 입력과 설정을 유지한 채 재시도한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		const publishPost: PublishPost = vi
			.fn<PublishPost>()
			.mockRejectedValueOnce(new Error('failed'))
			.mockResolvedValueOnce({ postId: 'retry-success', slug: 'rilog' });
		render(<NewPostController editorComponent={FakeEditor} publishPost={publishPost} navigate={navigate} />);
		postPublishedMock.mockClear();
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		const selectedCoLogId = await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		expect(await screen.findByText('failed')).toBeInTheDocument();
		expect(postPublishFailedMock).toHaveBeenCalledWith({
			failureStage: 'publish_request',
			errorCode: 'UNKNOWN_ERROR',
			errorKind: 'unknown',
		});
		expect(screen.getByRole('combobox', { name: '코로그' })).toHaveValue(selectedCoLogId);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/@rilog/posts/retry-success'));
		expect(publishPost).toHaveBeenCalledTimes(2);
		expect(postPublishedMock).toHaveBeenCalledTimes(1);
	});

	it('선택한 대표 이미지를 주입된 발행 설정에 포함한다', async () => {
		const createObjectUrl = vi.fn(() => 'blob:selected-cover');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const user = userEvent.setup();
		const navigate = vi.fn();
		const publishPost = vi.fn<PublishPost>().mockResolvedValue({ postId: 'with-cover', slug: 'rilog' });
		const { unmount } = render(
			<NewPostController editorComponent={FakeEditor} publishPost={publishPost} navigate={navigate} />,
		);
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		const coverImage = new File(['image'], 'cover.png', { type: 'image/png' });
		await user.upload(screen.getByLabelText('이미지 선택'), coverImage);
		await selectFirstCoLog(user);
		await user.selectOptions(screen.getByRole('combobox', { name: '챕터' }), '12');
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/@rilog/posts/with-cover'));
		expect(publishPost).toHaveBeenCalledOnce();
		expect(publishPost.mock.calls[0]?.[0].settings.representativeImage).toBe(coverImage);
		unmount();
		vi.unstubAllGlobals();
	});

	it('실제 발행 핸들러가 대표 이미지를 업로드하고 API 계약으로 전송한다', async () => {
		vi.stubGlobal(
			'URL',
			Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:selected-cover'), revokeObjectURL: vi.fn() }),
		);
		const user = userEvent.setup();
		const navigate = vi.fn();
		const coverImage = new File(['image'], 'cover.png', { type: 'image/png' });
		const { unmount } = render(<NewPostController editorComponent={FakeEditor} navigate={navigate} />);

		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		await user.upload(screen.getByLabelText('이미지 선택'), coverImage);
		await selectFirstCoLog(user);
		await user.selectOptions(screen.getByRole('combobox', { name: '챕터' }), '12');
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/@rilog-team/posts/77'));
		expect(uploadRepresentativeImageMock).toHaveBeenCalledWith({ file: coverImage, type: 'IMAGE' });
		expect(requestPostPublicationMock).toHaveBeenCalledWith({
			slug: 'rilog-team',
			title: 'BlockNote 도입기',
			content: [createParagraph('오늘 배운 내용을 기록합니다.')],
			category: 'TECH',
			visibility: 'PUBLIC',
			thumbnailImageUrl: 'posts/cover-object-key.png',
			chapterId: 12,
		});

		unmount();
		vi.unstubAllGlobals();
	});

	it('수정 초기 설정의 기존 블로그, 카테고리와 썸네일 key를 실제 API 요청에 유지한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		render(
			<EditPostController
				postId={31}
				editorComponent={FakeEditor}
				initialDocument={{ title: '기존 제목', blocks: [createParagraph('기존 본문')] }}
				initialPublicationSettings={{
					category: 'DAILY',
					blog: { type: 'RILOG', slug: 'personal-blog' },
					chapterId: 12,
					representativeImage: null,
					representativeImageUrl: 'posts/existing-thumbnail.png',
				}}
				navigate={navigate}
			/>,
		);

		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), ' 수정');
		await user.click(screen.getByRole('button', { name: '수정' }));
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(requestPostUpdateMock).toHaveBeenCalledOnce());
		expect(navigate).toHaveBeenCalledWith('/@personal-blog/posts/31');
		expect(uploadRepresentativeImageMock).not.toHaveBeenCalled();
		expect(requestPostPublicationMock).not.toHaveBeenCalled();
		expect(postPublishedMock).not.toHaveBeenCalled();
		const updateVariables = requestPostUpdateMock.mock.calls[0]?.[0];
		expect(updateVariables?.postId).toBe(31);
		expect(updateVariables?.request.slug).toBe('personal-blog');
		expect(updateVariables?.request).toMatchObject({
			category: 'DAILY',
			thumbnailImageUrl: 'posts/existing-thumbnail.png',
			chapterId: 12,
		});
	});

	it('대표 이미지를 선택하지 않으면 본문의 첫 이미지 URL을 API에 전송한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		render(<NewPostController editorComponent={FirstBodyImageEditor} navigate={navigate} />);

		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), 'BlockNote 도입기');
		await user.click(screen.getByRole('button', { name: '발행' }));
		await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/@rilog-team/posts/77'));
		expect(uploadRepresentativeImageMock).not.toHaveBeenCalled();
		expect(requestPostPublicationMock.mock.calls[0]?.[0].thumbnailImageUrl).toBe(
			'https://images.rilog.test/posts/first-body-image.png',
		);
	});

	it('선택 이미지와 본문 이미지가 모두 없으면 공통 기본 썸네일을 API에 전송한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		render(<NewPostController editorComponent={FakeEditor} navigate={navigate} />);

		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/@rilog-team/posts/77'));
		expect(uploadRepresentativeImageMock).not.toHaveBeenCalled();
		expect(requestPostPublicationMock.mock.calls[0]?.[0].thumbnailImageUrl).toBe('/images/thumbnail-fallback.svg');
	});

	it('dirty 상태의 내부 링크 이동을 확인하고 취소 또는 계속한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		const historyBackSpy = vi.spyOn(window.history, 'back');
		historyBackSpy.mockClear();
		render(<NewPostController editorComponent={FakeEditor} navigate={navigate} />);
		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), '이탈 보호');

		const link = document.createElement('a');
		link.href = '/next-page?from=write';
		link.textContent = '다른 페이지';
		document.body.append(link);
		await user.click(link);
		const leaveDialog = screen.getByRole('dialog', { name: '작성 중인 글을 나갈까요?' });
		await user.click(within(leaveDialog).getByRole('button', { name: '계속 작성' }));
		expect(navigate).not.toHaveBeenCalled();

		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '작성 중인 글을 나갈까요?' })).not.toBeInTheDocument(),
		);
		await user.click(link);
		await user.click(screen.getByRole('button', { name: '나가기' }));
		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/next-page?from=write'));
		expect(postDraftAbandonedMock).toHaveBeenCalledWith(
			expect.objectContaining({ documentState: 'title_only', editingTimeBucket: 'under_1m' }),
		);
		expect(historyBackSpy).not.toHaveBeenCalled();
		historyBackSpy.mockRestore();
		link.remove();
	});

	it('dirty 상태에서 beforeunload 기본 이탈 경고를 요청한다', async () => {
		const user = userEvent.setup();
		render(<NewPostController editorComponent={FakeEditor} />);
		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), '새로고침 보호');

		const beforeUnloadEvent = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(beforeUnloadEvent);

		expect(beforeUnloadEvent.defaultPrevented).toBe(true);
	});

	it('에디터 탭이 숨겨진 시간은 이탈 시 작성 시간에서 제외한다', async () => {
		let currentTime = 1_000;
		let visibilityState: DocumentVisibilityState = 'visible';
		vi.spyOn(Date, 'now').mockImplementation(() => currentTime);
		vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);
		const user = userEvent.setup();
		const navigate = vi.fn();
		render(<NewPostController editorComponent={FakeEditor} navigate={navigate} />);
		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), '활성 작성 시간');

		currentTime = 2_000;
		visibilityState = 'hidden';
		document.dispatchEvent(new Event('visibilitychange'));
		currentTime = 902_000;
		visibilityState = 'visible';
		document.dispatchEvent(new Event('visibilitychange'));
		currentTime = 903_000;

		const link = document.createElement('a');
		link.href = '/next-page';
		link.textContent = '다른 페이지';
		document.body.append(link);
		await user.click(link);
		await user.click(screen.getByRole('button', { name: '나가기' }));

		expect(postDraftAbandonedMock).toHaveBeenCalledWith({
			documentState: 'title_only',
			editingTimeBucket: 'under_1m',
		});
		link.remove();
	});
});
