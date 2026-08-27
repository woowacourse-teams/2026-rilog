import { describe, expect, it } from 'vitest';

import type { RilogProfileSettingsValue } from '../model/rilog-profile-settings';

import { mapRilogProfileUpdateRequest } from './map-rilog-profile-update-request';

const VALUE: RilogProfileSettingsValue = {
	nickname: '리로거',
	slug: 'rilogger',
	description: '기록하는 개발자',
	profileImageUrl: 'old-profile.png',
	serviceUrl: '',
	githubUrl: 'https://github.com/rilog',
	profileImageFile: null,
};

describe('mapRilogProfileUpdateRequest', () => {
	it('개인 프로필 설정값을 블로그 프로필 수정 요청으로 변환한다', () => {
		expect(mapRilogProfileUpdateRequest(VALUE, 'rilog/uploads/images/profile.png')).toEqual({
			name: '리로거',
			profileImageUrl: 'rilog/uploads/images/profile.png',
			coverImageUrl: null,
			introduction: '기록하는 개발자',
			serviceUrl: null,
			githubUrl: 'https://github.com/rilog',
		});
	});

	it('비어 있는 선택 정보와 제거한 프로필 이미지는 null로 변환한다', () => {
		expect(
			mapRilogProfileUpdateRequest(
				{
					...VALUE,
					description: '',
					serviceUrl: '',
					githubUrl: '',
				},
				'',
			),
		).toEqual({
			name: '리로거',
			profileImageUrl: null,
			coverImageUrl: null,
			introduction: null,
			serviceUrl: null,
			githubUrl: null,
		});
	});
});
