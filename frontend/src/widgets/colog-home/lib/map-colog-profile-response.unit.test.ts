import { describe, expect, it } from 'vitest';

import type { CologPublicProfileResponse } from '@/shared/api/blogs/types';

import { mapCologProfileResponse } from './map-colog-profile-response';

describe('mapCologProfileResponse', () => {
	it('API 응답을 CologProfile 모델로 올바르게 매핑한다', () => {
		const response: CologPublicProfileResponse = {
			type: 'COLOG',
			id: 1,
			name: '리로그 팀',
			slug: 'rilog-team',
			introduction: '안녕하세요, 리로그 팀입니다.',
			profileImageUrl: 'https://example.com/profile.png',
			coverImageUrl: 'https://example.com/cover.png',
			serviceUrl: 'https://rilog.example.com',
			githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
			memberCount: 5,
			postCount: 10,
		};

		const profile = mapCologProfileResponse(response);

		expect(profile).toEqual({
			name: '리로그 팀',
			slug: 'rilog-team',
			description: '안녕하세요, 리로그 팀입니다.',
			profileImageUrl: 'https://example.com/profile.png',
			coverImageUrl: 'https://example.com/cover.png',
			serviceUrl: 'https://rilog.example.com',
			githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
			email: undefined,
		});
	});

	it('null 값을 undefined로 적절하게 변환한다', () => {
		const response: CologPublicProfileResponse = {
			type: 'COLOG',
			id: 2,
			name: '빈 코로그',
			slug: 'empty-colog',
			introduction: null,
			profileImageUrl: null,
			coverImageUrl: null,
			serviceUrl: null,
			githubUrl: null,
			memberCount: 1,
			postCount: 0,
		};

		const profile = mapCologProfileResponse(response);

		expect(profile).toEqual({
			name: '빈 코로그',
			slug: 'empty-colog',
			description: undefined,
			profileImageUrl: null,
			coverImageUrl: null,
			serviceUrl: undefined,
			githubUrl: undefined,
			email: undefined,
		});
	});
});
