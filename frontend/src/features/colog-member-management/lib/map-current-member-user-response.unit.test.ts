import { describe, expect, it } from 'vitest';

import { mapCurrentMemberUserResponse } from './map-current-member-user-response';

describe('mapCurrentMemberUserResponse', () => {
	it('API 응답에서 현재 멤버 사용자 정보를 추출한다', () => {
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

		const result = mapCurrentMemberUserResponse(response);

		expect(result).toEqual({
			id: 1,
			slug: 'rilog',
			nickname: '리로그',
			profileImageUrl: 'https://example.com/profile.jpg',
		});
	});

	it('profileImageUrl이 null이어도 유지한다', () => {
		const response = {
			status: 200,
			message: 'OK',
			data: {
				id: 1,
				slug: 'rilog',
				nickname: '리로그',
				profileImageUrl: null,
				createdAt: '2023-01-01',
				updatedAt: '2023-01-01',
			},
		};

		const result = mapCurrentMemberUserResponse(response);

		expect(result).toEqual({
			id: 1,
			slug: 'rilog',
			nickname: '리로그',
			profileImageUrl: null,
		});
	});

	it('data가 없으면 undefined를 반환한다', () => {
		const response = {
			status: 200,
			message: 'OK',
			data: undefined,
		};

		const result = mapCurrentMemberUserResponse(response);

		expect(result).toBeUndefined();
	});
});
