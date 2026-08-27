import { describe, expect, it } from 'vitest';

import { getAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';

import { mapPostWriteResponse } from './map-post-write-response';

describe('mapPostWriteResponse', () => {
	it('API 응답을 공통 발행 결과로 변환한다', () => {
		expect(
			mapPostWriteResponse({
				status: 201,
				message: '게시글 발행에 성공했습니다.',
				data: { postId: 31, slug: 'rilog' },
			}),
		).toEqual({ postId: '31', slug: 'rilog' });
	});

	it('게시글 정보가 없는 응답을 거부한다', () => {
		expect.assertions(3);
		try {
			mapPostWriteResponse({ status: 201, message: '응답 데이터 없음' });
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toBe('발행 응답에 게시글 정보가 없습니다.');
			expect(getAnalyticsFailureStage(error)).toBe('publish_response');
		}
	});
});
