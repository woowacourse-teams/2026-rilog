import { describe, expect, it } from 'vitest';

import type { SignUpValue } from '../model/sign-up';

import { mapOnboardingRequest } from './map-onboarding-request';

const SIGN_UP_VALUE: SignUpValue = {
	nickname: ' 리로그 ',
	slug: ' rilog ',
	description: ' 함께 기록해요 ',
	serviceUrl: ' https://rilog.kr ',
	githubUrl: ' https://github.com/rilog ',
	profileImageFile: null,
};

describe('mapOnboardingRequest', () => {
	it('온보딩 값과 업로드된 프로필 이미지 key를 API 요청으로 변환한다', () => {
		expect(mapOnboardingRequest(SIGN_UP_VALUE, 'profiles/rilog.png')).toEqual({
			nickname: '리로그',
			slug: 'rilog',
			introduction: '함께 기록해요',
			profileImageUrl: 'profiles/rilog.png',
			serviceUrl: 'https://rilog.kr',
			githubUrl: 'https://github.com/rilog',
		});
	});

	it('비어 있는 선택 필드는 요청에서 생략한다', () => {
		expect(
			mapOnboardingRequest(
				{ ...SIGN_UP_VALUE, description: ' ', serviceUrl: '', githubUrl: ' ', profileImageFile: null },
				'',
			),
		).toEqual({ nickname: '리로그', slug: 'rilog' });
	});
});
