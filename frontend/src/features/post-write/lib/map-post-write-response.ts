import { withAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import type { PublishPostResult } from '@/features/post-write/model/post-publication';
import type { PostWriteResponse } from '@/shared/api/posts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

export const mapPostWriteResponse = (response: ApiResponse<PostWriteResponse>): PublishPostResult => {
	if (response.data === undefined) {
		throw withAnalyticsFailureStage(new Error('발행 응답에 게시글 정보가 없습니다.'), 'publish_response');
	}

	return {
		postId: String(response.data.postId),
		slug: response.data.slug,
	};
};
