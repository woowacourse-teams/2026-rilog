import { describe, expect, it } from 'vitest';

import { getAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';

import { mapDraftPublishResponse } from './map-draft-publish-response';

describe('mapDraftPublishResponse', () => {
	it('임시저장 발행 API 응답을 공통 발행 결과로 변환한다', () => {
		expect(
			mapDraftPublishResponse({
				status: 200,
				message: '임시저장 글을 발행했습니다.',
				data: { postId: 31, slug: 'rilog' },
			}),
		).toEqual({ postId: '31', slug: 'rilog' });
	});

	it('게시글 정보가 없는 응답을 거부한다', () => {
		expect.assertions(2);
		try {
			mapDraftPublishResponse({ status: 200, message: '응답 데이터 없음' });
		} catch (error) {
			expect(error).toHaveProperty('message', '발행 응답에 게시글 정보가 없습니다.');
			expect(getAnalyticsFailureStage(error)).toBe('publish_response');
		}
	});
});
