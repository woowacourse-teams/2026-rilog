import { describe, expect, it } from 'vitest';

import type { BlogMemberResponse } from '@/shared/api/cologs/types';

import { mapCologMemberResponse } from './map-colog-member-response';

describe('mapCologMemberResponse', () => {
	it('API 응답을 CologMember 타입으로 정상 변환한다', () => {
		const mockResponse: BlogMemberResponse = {
			id: 1,
			userId: 10,
			nickname: '리로그',
			slug: 'rilog',
			profileImageUrl: 'https://example.com/profile.png',
			permission: 'OWNER',
			blogRole: '백엔드 개발자',
			joinedAt: '2026-08-20T10:00:00Z',
		};

		const result = mapCologMemberResponse(mockResponse);

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
});
