import type { InlineCommentOpenRequest } from '../model/inline-comment-interaction';
import type { InlineCommentThreadModel } from '../model/inline-comment-thread';

import type { InlineCommentBlockResponse } from '@/shared/api/posts/types';

export const getAllInlineCommentThreads = (blocks: readonly InlineCommentBlockResponse[]): InlineCommentThreadModel[] =>
	blocks.flatMap((block) => block.anchors.map((anchor) => ({ blockId: block.blockId, anchor })));

export const getInlineCommentThreadsByRequest = (
	blocks: readonly InlineCommentBlockResponse[],
	request: InlineCommentOpenRequest,
): InlineCommentThreadModel[] => {
	const requestedAnchorIds = new Set(request.anchorIds);

	return blocks
		.filter((block) => block.blockId === request.blockId)
		.flatMap((block) =>
			block.anchors
				.filter((anchor) => requestedAnchorIds.has(anchor.anchorId))
				.map((anchor) => ({ blockId: block.blockId, anchor })),
		);
};
