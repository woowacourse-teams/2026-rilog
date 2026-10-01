import { describe, expect, it } from 'vitest';

import { mapMemberInviteCandidateResponse } from './map-member-invite-candidate-response';

describe('mapMemberInviteCandidateResponse', () => {
	it('API 응답에서 멤버 초대 후보자 정보를 추출한다', () => {
		const response = {
			status: 200,
			message: 'OK',
			data: {
				id: 1,
				slug: 'rilog',
				nickname: '리로그',
				profileImageUrl: 'https://example.com/profile.jpg',
				createdAt: '2023-01-01',
				updatedAt: '2023-01-01',
			},
		};

		const result = mapMemberInviteCandidateResponse(response);

		expect(result).toEqual({
			userId: 1,
			slug: 'rilog',
			nickname: '리로그',
			profileImageUrl: 'https://example.com/profile.jpg',
		});
	});

	it('data가 없으면 undefined를 반환한다', () => {
		const response = {
			status: 200,
			message: 'OK',
			data: undefined,
		};

		const result = mapMemberInviteCandidateResponse(response);

		expect(result).toBeUndefined();
	});
});
