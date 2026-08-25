import { describe, expect, it } from 'vitest';

import type { BlogPublicProfileResponse } from '@/shared/api/blogs/types';

import { mapCologProfileSettingsResponse } from './map-colog-profile-settings-response';

describe('mapCologProfileSettingsResponse', () => {
	it('API 프로필 응답을 설정 폼 초기값으로 변환한다', () => {
		const response: BlogPublicProfileResponse = {
			type: 'COLOG',
			id: 1,
			name: '리로그 팀',
			slug: 'rilog-team',
			introduction: '함께 기록하는 팀',
			profileImageUrl: 'https://example.com/profile.png',
			coverImageUrl: 'https://example.com/cover.png',
			serviceUrl: 'https://rilog.example.com',
			githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
			memberCount: 5,
			postCount: 10,
		};

		expect(mapCologProfileSettingsResponse(response)).toEqual({
			name: '리로그 팀',
			slug: 'rilog-team',
			description: '함께 기록하는 팀',
			profileImageUrl: 'https://example.com/profile.png',
			coverImageUrl: 'https://example.com/cover.png',
			serviceUrl: 'https://rilog.example.com',
			githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
			logoFile: null,
			coverImageFile: null,
		});
	});

	it('선택 정보가 null이면 빈 문자열로 변환한다', () => {
		const response: BlogPublicProfileResponse = {
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

		expect(mapCologProfileSettingsResponse(response)).toEqual({
			name: '빈 코로그',
			slug: 'empty-colog',
			description: '',
			profileImageUrl: '',
			coverImageUrl: '',
			serviceUrl: '',
			githubUrl: '',
			logoFile: null,
			coverImageFile: null,
		});
	});
});
