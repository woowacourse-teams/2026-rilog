import { describe, expect, it } from 'vitest';

import type { BlogPublicProfileResponse } from '@/shared/api/blogs/types';

import { mapRilogProfileSettingsResponse } from './map-rilog-profile-settings-response';

describe('mapRilogProfileSettingsResponse', () => {
	it('블로그 조회 응답을 개인 프로필 설정 폼 초기값으로 변환한다', () => {
		const response: BlogPublicProfileResponse = {
			type: 'RILOG',
			id: 1,
			name: '리로거',
			slug: 'rilogger',
			introduction: '기록하고 성장하는 개발자입니다.',
			profileImageUrl: 'https://example.com/profile.png',
			coverImageUrl: null,
			serviceUrl: 'https://rilog.kr',
			githubUrl: 'https://github.com/rilog',
			memberCount: 1,
			postCount: 3,
		};

		expect(mapRilogProfileSettingsResponse(response)).toEqual({
			nickname: '리로거',
			slug: 'rilogger',
			description: '기록하고 성장하는 개발자입니다.',
			profileImageUrl: 'https://example.com/profile.png',
			serviceUrl: 'https://rilog.kr',
			githubUrl: 'https://github.com/rilog',
			profileImageFile: null,
		});
	});

	it('선택 정보가 null이면 빈 문자열로 변환한다', () => {
		const response: BlogPublicProfileResponse = {
			type: 'RILOG',
			id: 2,
			name: '빈 프로필',
			slug: 'empty-profile',
			introduction: null,
			profileImageUrl: null,
			coverImageUrl: null,
			serviceUrl: null,
			githubUrl: null,
			memberCount: 1,
			postCount: 0,
		};

		expect(mapRilogProfileSettingsResponse(response)).toEqual({
			nickname: '빈 프로필',
			slug: 'empty-profile',
			description: '',
			profileImageUrl: '',
			serviceUrl: '',
			githubUrl: '',
			profileImageFile: null,
		});
	});
});
