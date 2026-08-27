import { withAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import type { PublishPostResult } from '@/features/post-write/model/post-publication';
import type { DraftPublishResponse } from '@/shared/api/drafts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

export const mapDraftPublishResponse = (response: ApiResponse<DraftPublishResponse>): PublishPostResult => {
	if (response.data === undefined) {
		throw withAnalyticsFailureStage(new Error('발행 응답에 게시글 정보가 없습니다.'), 'publish_response');
	}

	return {
		postId: String(response.data.postId),
		slug: response.data.slug,
	};
};
