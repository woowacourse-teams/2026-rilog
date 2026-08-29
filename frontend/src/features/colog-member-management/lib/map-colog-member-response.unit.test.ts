import { describe, expect, it } from 'vitest';

import type { BlogMemberResponse } from '@/shared/api/cologs/types';

import { mapCologMemberResponse, mapCologMembersResponse } from './map-colog-member-response';

const MEMBER_RESPONSE: BlogMemberResponse = {
	id: 1,
	userId: 10,
	nickname: '리로그',
	slug: 'rilog',
	profileImageUrl: 'https://example.com/profile.png',
	permission: 'OWNER',
	blogRole: '백엔드 개발자',
	joinedAt: '2026-08-20T10:00:00Z',
};

describe('mapCologMemberResponse', () => {
	it('API 응답을 CologMember 타입으로 정상 변환한다', () => {
		const result = mapCologMemberResponse(MEMBER_RESPONSE);

		expect(result).toEqual({
			id: 1,
			nickname: '리로그',
			slug: 'rilog',
			profileImageUrl: 'https://example.com/profile.png',
			permission: 'OWNER',
			blogRole: '백엔드 개발자',
			joinedAt: '2026-08-20T10:00:00Z',
		});

		// @ts-expect-error userId should not be in CologMember
		expect(result.userId).toBeUndefined();
	});

	it('멤버 목록 API 응답을 initialMembers 타입으로 변환한다', () => {
		const result = mapCologMembersResponse({
			status: 200,
			message: '팀 멤버 목록 조회에 성공했습니다.',
			data: [MEMBER_RESPONSE],
		});

		expect(result).toEqual([
			{
				id: 1,
				nickname: '리로그',
				slug: 'rilog',
				profileImageUrl: 'https://example.com/profile.png',
				permission: 'OWNER',
				blogRole: '백엔드 개발자',
				joinedAt: '2026-08-20T10:00:00Z',
			},
		]);
	});

	it('멤버 목록 API 응답에 data가 없으면 빈 배열을 반환한다', () => {
		const result = mapCologMembersResponse({
			status: 200,
			message: '팀 멤버 목록 조회에 성공했습니다.',
		});

		expect(result).toEqual([]);
	});
});
