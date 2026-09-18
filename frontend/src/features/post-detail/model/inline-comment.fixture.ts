import type { InlineCommentBlockResponse, InlineCommentResponse } from '@/shared/api/posts/types';

const createComment = (
	commentId: number,
	content: string,
	overrides: Partial<InlineCommentResponse> = {},
): InlineCommentResponse => ({
	commentId,
	content,
	author: {
		userId: 570,
		nickname: '인라인댓글테스터',
		slug: 'inline-comment-tester',
		profileImageUrl: null,
		isAuthor: false,
		isBlogMember: true,
	},
	canEdit: true,
	canDelete: true,
	createdAt: '2026-09-17T10:20:00',
	updatedAt: '2026-09-17T10:20:00',
	...overrides,
});

export const POST_81_INLINE_COMMENT_BLOCKS_FIXTURE: InlineCommentBlockResponse[] = [
	{
		blockId: 'f3be6e57-521a-4c8e-8b8a-c8da6b105207',
		anchors: [
			{
				anchorId: 5701,
				range: { startOffset: 7, endOffset: 20 },
				selectedText: 'Rilog.의 프론트엔드',
				state: 'ACTIVE',
				comments: [createComment(57001, '인라인 스타일이 포함된 첫 번째 mock 댓글입니다.')],
			},
		],
	},
	{
		blockId: '90483f61-d7f4-4347-87d2-7c294774b563',
		anchors: [
			{
				anchorId: 5702,
				range: { startOffset: 18, endOffset: 31 },
				selectedText: '로그인 모달을 여는 코드',
				state: 'ACTIVE',
				comments: [
					createComment(57002, '같은 블록의 첫 번째 ACTIVE 앵커입니다.'),
					createComment(57003, '하나의 앵커에 댓글이 여러 개 있는 경우입니다.', {
						canEdit: false,
						canDelete: false,
					}),
				],
			},
			{
				anchorId: 5703,
				range: { startOffset: 22, endOffset: 38 },
				selectedText: '모달을 여는 코드도 자연스럽게',
				state: 'ACTIVE',
				comments: [createComment(57004, '앞 앵커와 범위가 중첩되는 두 번째 ACTIVE 앵커입니다.')],
			},
			{
				anchorId: 5704,
				range: { startOffset: 0, endOffset: 7 },
				selectedText: '과거의 인용문',
				state: 'OUTDATED',
				comments: [createComment(57005, 'OUTDATED라서 본문에는 하이라이트되지 않아야 합니다.')],
			},
		],
	},
	{
		blockId: '7bfa7e36-5e74-45ff-a8cb-1dfd3727a05d',
		anchors: [
			{
				anchorId: 5705,
				range: { startOffset: 0, endOffset: 13 },
				selectedText: '가장 단순한 로그인 모달',
				state: 'ACTIVE',
				comments: [createComment(57006, '제목 블록에도 표시되는 mock 댓글입니다.')],
			},
		],
	},
	{
		blockId: '5b9e1661-9fbc-48dc-aa80-5c52fed49bdc',
		anchors: [
			{
				anchorId: 5706,
				range: { startOffset: 19, endOffset: 37 },
				selectedText: 'LoginModalProvider',
				state: 'ACTIVE',
				comments: [createComment(57007, '인라인 코드 전체를 선택한 mock 댓글입니다.')],
			},
			{
				anchorId: 5707,
				range: { startOffset: 10, endOffset: 41 },
				selectedText: '루트 레이아웃에 LoginModalProvider를 배치',
				state: 'ACTIVE',
				comments: [createComment(57008, '일반 텍스트와 인라인 코드를 함께 선택한 mock 댓글입니다.')],
			},
		],
	},
];
