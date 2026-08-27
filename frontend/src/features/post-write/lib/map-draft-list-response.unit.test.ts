import { describe, expect, it } from 'vitest';

import { mapDraftListResponse } from './map-draft-list-response';

describe('mapDraftListResponse', () => {
	it('임시저장 목록 DTO를 작성 화면의 목록 항목으로 변환한다', () => {
		expect(
			mapDraftListResponse({
				status: 200,
				message: 'OK',
				data: {
					drafts: [{ draftId: 42, title: '작성 중인 글', publishedAt: '2026-08-27T10:29:46.466Z' }],
					page: 0,
					size: 10,
					numberOfElements: 1,
					hasNext: false,
				},
			}),
		).toEqual([{ id: 42, title: '작성 중인 글', savedAt: '2026-08-27T10:29:46.466Z' }]);
	});

	it('data가 없는 응답을 거부한다', () => {
		expect(() => mapDraftListResponse({ status: 200, message: '응답 데이터 없음' })).toThrow(
			'임시저장 목록 응답에 초안 정보가 없습니다.',
		);
	});
});
