import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import type { PostCommentAnchorsSidebarResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

import { mapPostCommentAnchorGroup } from './map-post-comment-anchors-response';

export const mapPostCommentAnchorsSidebarResponse = (
	response: ApiResponse<PostCommentAnchorsSidebarResponse>,
): InlineCommentThreadModel[] => {
	if (!response.data) throw new Error('인라인 댓글 응답 데이터가 없습니다.');
	return response.data.anchorGroups.map((group) => ({
		blockId: group.blockId,
		anchor: mapPostCommentAnchorGroup(group),
	}));
};
