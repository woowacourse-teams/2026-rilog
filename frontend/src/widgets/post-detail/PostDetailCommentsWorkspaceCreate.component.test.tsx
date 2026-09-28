import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import type { InlineCommentBlockModel } from '@/features/post-detail/model/inline-comment';
import type { InlineCommentSelectionTarget } from '@/features/post-detail/model/inline-comment-interaction';
import {
	addPostCommentAnchor,
	createPostCommentAnchor,
	readPostCommentAnchors,
	readPostCommentAnchorsSidebar,
} from '@/shared/api/posts/api';
import { InvalidApiResponseError } from '@/shared/api/response-validation';
import { createApiFailure } from '@/test/fixtures/api-error';
import { renderWithQuery } from '@/test/render-with-query';

import PostDetailCommentsWorkspace from './PostDetailCommentsWorkspace';

vi.mock('@/shared/api/posts/api', () => ({
	readPostCommentAnchors: vi.fn(),
	readPostCommentAnchorsSidebar: vi.fn(),
	createPostCommentAnchor: vi.fn(),
	addPostCommentAnchor: vi.fn(),
}));

vi.mock('@/features/post-detail/ui/PostDetailContent', () => ({
	default: ({
		onInlineCommentOpen,
		onInlineCommentCreate,
	}: {
		onInlineCommentOpen: (request: unknown) => void;
		onInlineCommentCreate: (selection: InlineCommentSelectionTarget) => void;
	}) => (
		<div>
			<button
				type="button"
				onClick={() =>
					onInlineCommentCreate({ blockId: 'block-1', startOffset: 4, endOffset: 8, selectedText: '새 인용' })
				}
			>
				새 인용 댓글 입력
			</button>
			<button
				type="button"
				onClick={() =>
					onInlineCommentCreate({ blockId: 'block-1', startOffset: 0, endOffset: 1, selectedText: '첫 번째 인용' })
				}
			>
				기존 인용 댓글 입력
			</button>
			<button
				type="button"
				onClick={() => onInlineCommentOpen({ blockId: 'block-1', anchorIds: [1], source: 'highlight' })}
			>
				하이라이트 댓글 열기
			</button>
			<button
				type="button"
				onClick={() => onInlineCommentOpen({ blockId: 'block-1', anchorIds: [1, 2], source: 'block' })}
			>
				블록 댓글 열기
			</button>
		</div>
	),
}));

const comment = (commentId: number, content: string) => ({
	commentId,
	content,
	author: {
		userId: commentId,
		nickname: `댓글러 ${commentId}`,
		slug: `commenter-${commentId}`,
		profileImageUrl: null,
		isAuthor: false,
		isBlogMember: false,
	},
	isEdited: false,
	canEdit: false,
	canDelete: false,
	createdAt: '2026-09-17T10:20:00',
	updatedAt: '2026-09-17T10:20:00',
});

const BLOCKS: InlineCommentBlockModel[] = [
	{
		blockId: 'block-1',
		anchors: [
			{
				anchorId: 1,
				commentCount: 1,
				range: { startOffset: 0, endOffset: 1 },
				selectedText: '첫 번째 인용',
				state: 'ACTIVE',
				comments: [comment(1, '첫 댓글')],
			},
			{
				anchorId: 2,
				commentCount: 1,
				range: { startOffset: 2, endOffset: 3 },
				selectedText: '오래된 인용',
				state: 'OUTDATED',
				comments: [comment(2, '둘째 댓글')],
			},
		],
	},
	{
		blockId: 'block-2',
		anchors: [
			{
				anchorId: 3,
				commentCount: 1,
				range: { startOffset: 0, endOffset: 1 },
				selectedText: '다른 블록 인용',
				state: 'ACTIVE',
				comments: [comment(3, '셋째 댓글')],
			},
		],
	},
];

const render = (ui: ReactNode) =>
	renderWithQuery(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false }}>
			{ui}
		</AUTH_CONTEXT.Provider>,
	);

const renderWorkspaceUI = () =>
	render(
		<PostDetailCommentsWorkspace
			html="<p>본문</p>"
			postId={81}
			ownerType="RILOG"
			category="TECH"
			enableInlineCommentSelectionDebug={false}
			profileSection={<div>프로필</div>}
		/>,
	);

const RESPONSE = {
	status: 0,
	message: 'OK',
	data: {
		blocks: BLOCKS.map((block) => ({
			blockId: block.blockId,
			anchorGroups: block.anchors.map((anchor) => ({
				selectionId: anchor.anchorId,
				range: anchor.range,
				selectedText: anchor.selectedText,
				state: anchor.state === 'OUTDATED' ? ('ORPHANED' as const) : anchor.state,
				anchorCount: anchor.comments.length,
				commentAnchors: anchor.comments.map(({ commentId, author, ...commentData }) => ({
					...commentData,
					commentAnchorId: commentId,
					author: { ...author, isPostAuthor: author.isAuthor },
				})),
			})),
		})),
	},
};
const toSidebarResponse = (response: typeof RESPONSE) => ({
	...response,
	data: {
		anchorGroups: response.data.blocks.flatMap(({ blockId, anchorGroups }) =>
			anchorGroups.map((group) => ({ ...group, blockId })),
		),
	},
});
const setReadResponses = (response: typeof RESPONSE) => {
	vi.mocked(readPostCommentAnchors).mockResolvedValue(response);
	vi.mocked(readPostCommentAnchorsSidebar).mockResolvedValue(toSidebarResponse(response));
};
const renderWorkspace = async () => {
	const result = renderWorkspaceUI();
	await screen.findAllByRole('button', { name: '전체 댓글 3개 보기' });
	return result;
};

describe('PostDetailCommentsWorkspace', () => {
	it('기존 스레드의 selectionId로 한 번만 추가하고 목록 갱신 후 초안을 지운다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();
		let resolve!: (value: { status: number; message: string; data: { commentAnchorId: number } }) => void;
		vi.mocked(addPostCommentAnchor).mockImplementation(
			() =>
				new Promise((done) => {
					resolve = done;
				}),
		);
		await user.click(screen.getByRole('button', { name: '기존 인용 댓글 입력' }));
		await user.type(screen.getByRole('textbox', { name: '댓글 입력' }), '추가 댓글');
		await user.dblClick(screen.getByRole('button', { name: '작성' }));
		expect(addPostCommentAnchor).toHaveBeenCalledExactlyOnceWith(81, 1, { content: '추가 댓글' });
		expect(createPostCommentAnchor).not.toHaveBeenCalled();
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toBeDisabled();
		const group = RESPONSE.data.blocks[0].anchorGroups[0];
		setReadResponses({
			...RESPONSE,
			data: {
				blocks: [
					{
						blockId: 'block-1',
						anchorGroups: [
							{
								...group,
								anchorCount: 2,
								commentAnchors: [
									...group.commentAnchors,
									{ ...group.commentAnchors[0], commentAnchorId: 901, content: '추가 댓글' },
								],
							},
						],
					},
				],
			},
		});
		resolve({ status: 0, message: 'OK', data: { commentAnchorId: 901 } });
		expect(await screen.findByText('추가 댓글', { selector: 'p' })).toBeVisible();
		expect(screen.getByRole('dialog', { name: '인라인 댓글 2' })).toBeVisible();
		await waitFor(() => expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveValue(''));
		expect(sessionStorage.getItem('rilog:inline-comment-draft:1')).toBeNull();
		await user.type(screen.getByRole('textbox', { name: '댓글 입력' }), '다음 댓글');
		expect(screen.getByRole('button', { name: '작성' })).toBeEnabled();
	});

	it('기존 스레드 작성 실패 후에도 초안을 유지하고 재시도한다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();
		vi.mocked(addPostCommentAnchor).mockRejectedValueOnce(new Error('실패'));
		await user.click(screen.getByRole('button', { name: '기존 인용 댓글 입력' }));
		await user.type(screen.getByRole('textbox', { name: '댓글 입력' }), '남길 댓글');
		await user.click(screen.getByRole('button', { name: '작성' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('댓글을 등록하지 못했습니다');
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveValue('남길 댓글');
		expect(sessionStorage.getItem('rilog:inline-comment-draft:1')).toBe('남길 댓글');
		await user.click(screen.getByRole('button', { name: '작성' }));
		await waitFor(() => expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveValue(''));
		expect(addPostCommentAnchor).toHaveBeenCalledTimes(2);
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('기존 스레드 작성 결과를 확인할 수 없으면 초안을 보존하고 목록 확인을 안내한다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();
		vi.mocked(addPostCommentAnchor).mockRejectedValue(new InvalidApiResponseError('add comment'));
		await user.click(screen.getByRole('button', { name: '기존 인용 댓글 입력' }));
		await user.type(screen.getByRole('textbox', { name: '댓글 입력' }), '확인할 댓글');
		await user.click(screen.getByRole('button', { name: '작성' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('댓글 목록에서 등록 여부를 확인');
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveValue('확인할 댓글');
		expect(addPostCommentAnchor).toHaveBeenCalledTimes(1);
	});

	it('선택 범위가 만료되면 다시 선택하도록 안내하고 초안을 보존한다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();
		vi.mocked(createPostCommentAnchor).mockRejectedValue(await createApiFailure('COMMENT_ANCHOR_NOT_ACTIVE', 409));
		await user.click(screen.getByRole('button', { name: '새 인용 댓글 입력' }));
		await user.type(screen.getByRole('textbox', { name: '댓글 입력' }), '보존할 댓글');
		await user.click(screen.getByRole('button', { name: '작성' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('인용할 부분을 다시 선택');
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveValue('보존할 댓글');
	});

	it('새 인용 작성 성공 후 응답 댓글 id가 속한 스레드를 열고 초안을 지운다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();
		let resolve!: (value: { status: number; message: string; data: { commentAnchorId: number } }) => void;
		vi.mocked(createPostCommentAnchor).mockImplementation(
			() =>
				new Promise((done) => {
					resolve = done;
				}),
		);
		await user.click(screen.getByRole('button', { name: '새 인용 댓글 입력' }));
		await user.type(screen.getByRole('textbox', { name: '댓글 입력' }), '새 댓글');
		await user.dblClick(screen.getByRole('button', { name: '작성' }));
		expect(createPostCommentAnchor).toHaveBeenCalledExactlyOnceWith(81, {
			blockId: 'block-1',
			startOffset: 4,
			endOffset: 8,
			selectedText: '새 인용',
			content: '새 댓글',
		});
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '작성 중…' })).toBeDisabled();
		const createdGroup = {
			...RESPONSE.data.blocks[0].anchorGroups[0],
			selectionId: 91,
			range: { startOffset: 4, endOffset: 8 },
			selectedText: '새 인용',
			commentAnchors: [
				{ ...RESPONSE.data.blocks[0].anchorGroups[0].commentAnchors[0], commentAnchorId: 900, content: '새 댓글' },
			],
		};
		setReadResponses({
			...RESPONSE,
			data: { blocks: [{ blockId: 'block-1', anchorGroups: [createdGroup] }] },
		});
		resolve({ status: 0, message: 'OK', data: { commentAnchorId: 900 } });
		expect(await screen.findByRole('article', { name: '댓글러 1님의 댓글' })).toHaveTextContent('새 댓글');
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveValue('');
		expect(
			sessionStorage.getItem(
				'rilog:inline-comment-draft:selection:' + JSON.stringify([81, 'block-1', 4, 8, '새 인용']),
			),
		).toBeNull();
	});

	it('작성 실패 시 초안을 보존하고 같은 내용으로 재시도할 수 있다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();
		vi.mocked(createPostCommentAnchor).mockRejectedValue(new Error('서버 오류'));
		await user.click(screen.getByRole('button', { name: '새 인용 댓글 입력' }));
		await user.type(screen.getByRole('textbox', { name: '댓글 입력' }), '보존할 댓글');
		await user.click(screen.getByRole('button', { name: '작성' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('댓글을 등록하지 못했습니다');
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveValue('보존할 댓글');
		await user.click(screen.getByRole('button', { name: '작성' }));
		await waitFor(() => expect(createPostCommentAnchor).toHaveBeenCalledTimes(2));
	});

	it('새 인용 작성 결과를 확인할 수 없으면 초안을 보존하고 목록 확인을 안내한다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();
		vi.mocked(createPostCommentAnchor).mockRejectedValue(new InvalidApiResponseError('create comment'));
		await user.click(screen.getByRole('button', { name: '새 인용 댓글 입력' }));
		await user.type(screen.getByRole('textbox', { name: '댓글 입력' }), '확인할 댓글');
		await user.click(screen.getByRole('button', { name: '작성' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('댓글 목록에서 등록 여부를 확인');
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveValue('확인할 댓글');
		expect(createPostCommentAnchor).toHaveBeenCalledTimes(1);
	});

	it('기존 스레드의 작성 버튼은 새 스레드 API를 호출하지 않는다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();
		await user.click(screen.getByRole('button', { name: '기존 인용 댓글 입력' }));
		await user.type(screen.getByRole('textbox', { name: '댓글 입력' }), '기존 스레드 댓글');
		await user.click(screen.getByRole('button', { name: '작성' }));
		expect(createPostCommentAnchor).not.toHaveBeenCalled();
	});

	beforeEach(() => {
		sessionStorage.clear();
		vi.mocked(createPostCommentAnchor).mockReset();
		vi.mocked(addPostCommentAnchor)
			.mockReset()
			.mockResolvedValue({ status: 0, message: 'OK', data: { commentAnchorId: 901 } });
		vi.mocked(readPostCommentAnchors).mockReset().mockResolvedValue(RESPONSE);
		vi.mocked(readPostCommentAnchorsSidebar).mockReset().mockResolvedValue(toSidebarResponse(RESPONSE));
	});
	it('새 선택은 인용과 입력창을 바로 열고 초안을 다시 복원한다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();
		await user.click(screen.getByRole('button', { name: '새 인용 댓글 입력' }));
		expect(screen.getByRole('dialog', { name: '인라인 댓글 0' })).toBeVisible();
		expect(screen.getByRole('region', { name: '"새 인용" 댓글' })).toBeVisible();
		const input = screen.getByRole('textbox', { name: '댓글 입력' });
		expect(input).toHaveFocus();
		await user.type(input, '작성 중인 초안');
		await user.click(screen.getByRole('button', { name: '댓글 사이드바 닫기' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		await user.click(screen.getByRole('button', { name: '새 인용 댓글 입력' }));
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveValue('작성 중인 초안');
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveFocus();
		expect(screen.queryByRole('button', { name: /댓글 (펼치기|접기)/ })).not.toBeInTheDocument();
	});

	it('같은 범위의 기존 앵커가 있으면 해당 스레드를 펼치고 입력창에 포커스한다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();
		await user.click(screen.getByRole('button', { name: '기존 인용 댓글 입력' }));
		expect(screen.getByRole('region', { name: '"첫 번째 인용" 댓글' })).toBeVisible();
		expect(screen.getByRole('article', { name: '댓글러 1님의 댓글' })).toHaveTextContent('첫 댓글');
		expect(screen.getByRole('textbox', { name: '댓글 입력' })).toHaveFocus();
		expect(screen.queryByRole('button', { name: /댓글 (펼치기|접기)/ })).not.toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '"첫 번째 인용" 새 댓글' })).not.toBeInTheDocument();
	});

	it('백드롭으로 닫거나 다른 앵커 목록으로 전환해도 초안을 앵커별로 복원한다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();
		const openAll = () => user.click(screen.getAllByRole('button', { name: '전체 댓글 3개 보기' })[0]);
		const firstRegion = () => within(screen.getByRole('region', { name: '"첫 번째 인용" 댓글' }));
		const thirdRegion = () => within(screen.getByRole('region', { name: '"다른 블록 인용" 댓글' }));

		await openAll();
		await user.click(firstRegion().getByRole('button', { name: '댓글 펼치기' }));
		await user.type(firstRegion().getByRole('textbox', { name: '댓글 입력' }), '첫 초안{Enter}둘째 줄');
		await user.click(thirdRegion().getByRole('button', { name: '댓글 펼치기' }));
		await user.type(thirdRegion().getByRole('textbox', { name: '댓글 입력' }), '다른 앵커 초안');
		await user.click(screen.getByRole('dialog'));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

		await user.click(screen.getByRole('button', { name: '하이라이트 댓글 열기' }));
		expect(firstRegion().getByRole('textbox', { name: '댓글 입력' })).toHaveValue('첫 초안\n둘째 줄');
		expect(screen.queryByRole('region', { name: '"다른 블록 인용" 댓글' })).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '댓글 사이드바 닫기' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

		await openAll();
		await user.click(thirdRegion().getByRole('button', { name: '댓글 펼치기' }));
		expect(thirdRegion().getByRole('textbox', { name: '댓글 입력' })).toHaveValue('다른 앵커 초안');
		await user.clear(firstRegion().getByRole('textbox', { name: '댓글 입력' }));
		await user.click(screen.getByRole('button', { name: '댓글 사이드바 닫기' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		await openAll();
		expect(firstRegion().getByRole('textbox', { name: '댓글 입력' })).toHaveValue('');
		expect(thirdRegion().getByRole('textbox', { name: '댓글 입력' })).toHaveValue('다른 앵커 초안');
	});

	it('블록 댓글 클릭 시 해당 블록의 ACTIVE 인용만 연다', async () => {
		const user = userEvent.setup();
		await renderWorkspace();

		await user.click(screen.getByRole('button', { name: '블록 댓글 열기' }));
		expect(screen.getByRole('dialog', { name: '인라인 댓글 1' })).toBeInTheDocument();
		expect(screen.getAllByRole('button', { name: '댓글 펼치기' })).toHaveLength(1);

		expect(screen.getByRole('region', { name: '"첫 번째 인용" 댓글' })).toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '"오래된 인용" 댓글' })).not.toBeInTheDocument();
		expect(screen.queryByRole('region', { name: '"다른 블록 인용" 댓글' })).not.toBeInTheDocument();
	});
});
