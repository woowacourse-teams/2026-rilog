import type { InlineCommentAnchorModel, InlineCommentBlockModel } from '../model/inline-comment';

import type { PostCommentAnchorGroupResponse, PostCommentAnchorsResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

export const mapPostCommentAnchorsResponse = (
	response: ApiResponse<PostCommentAnchorsResponse>,
): InlineCommentBlockModel[] => {
	if (!response.data) throw new Error('인라인 댓글 응답 데이터가 없습니다.');
	return response.data.blocks.map((block) => ({
		blockId: block.blockId,
		anchors: block.anchorGroups.map(mapPostCommentAnchorGroup),
	}));
};

export const mapPostCommentAnchorGroup = (group: PostCommentAnchorGroupResponse): InlineCommentAnchorModel => ({
	anchorId: group.selectionId,
	commentCount: group.anchorCount,
	range: group.range,
	selectedText: group.selectedText,
	state: group.state === 'ORPHANED' ? 'OUTDATED' : group.state,
	comments: group.commentAnchors.map(({ commentAnchorId, author, ...comment }) => ({
		...comment,
		commentId: commentAnchorId,
		author: {
			userId: author.userId,
			nickname: author.nickname,
			slug: author.slug,
			profileImageUrl: author.profileImageUrl,
			isAuthor: author.isPostAuthor,
			isBlogMember: author.isBlogMember,
		},
	})),
});
