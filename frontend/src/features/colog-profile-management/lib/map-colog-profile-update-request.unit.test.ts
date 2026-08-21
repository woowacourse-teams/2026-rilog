import { describe, expect, it } from 'vitest';

import type { CologProfileSettingsValue } from '../model/colog-profile-settings';

import { mapCologProfileUpdateRequest } from './map-colog-profile-update-request';

const PROFILE_VALUE: CologProfileSettingsValue = {
	name: '리로그 팀',
	slug: 'rilog-team',
	description: '함께 기록하는 팀',
	profileImageUrl: 'existing-logo.png',
	coverImageUrl: 'existing-cover.png',
	serviceUrl: 'https://rilog.example.com',
	githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
	logoFile: null,
	coverImageFile: null,
};

describe('mapCologProfileUpdateRequest', () => {
	it('업로드된 이미지 key와 폼 텍스트를 프로필 수정 요청으로 변환한다', () => {
		expect(
			mapCologProfileUpdateRequest(PROFILE_VALUE, {
				profileImageUrl: 'rilog/uploads/images/new-logo.png',
				coverImageUrl: 'rilog/uploads/images/new-cover.png',
			}),
		).toEqual({
			name: '리로그 팀',
			profileImageUrl: 'rilog/uploads/images/new-logo.png',
			coverImageUrl: 'rilog/uploads/images/new-cover.png',
			introduction: '함께 기록하는 팀',
			serviceUrl: 'https://rilog.example.com',
			githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
		});
	});

	it('비어 있는 선택 필드와 삭제된 이미지를 null로 보낸다', () => {
		expect(
			mapCologProfileUpdateRequest(
				{ ...PROFILE_VALUE, description: '', serviceUrl: undefined, githubUrl: '' },
				{ profileImageUrl: '', coverImageUrl: '' },
			),
		).toEqual({
			name: '리로그 팀',
			profileImageUrl: null,
			coverImageUrl: null,
			introduction: null,
			serviceUrl: null,
			githubUrl: null,
		});
	});
});
