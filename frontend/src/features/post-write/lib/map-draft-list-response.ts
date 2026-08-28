import type { DraftPostItem } from '@/features/post-write/model/post-draft';
import type { DraftListResponse } from '@/shared/api/drafts/types';
import type { ApiResponse } from '@/shared/api/shared.types';

export const mapDraftListResponse = (response: ApiResponse<DraftListResponse>): DraftPostItem[] => {
	if (response.data === undefined) {
		throw new Error('임시저장 목록 응답에 초안 정보가 없습니다.');
	}

	return response.data.drafts.map(({ draftId, title, publishedAt }) => ({
		id: draftId,
		title,
		savedAt: publishedAt,
	}));
};
