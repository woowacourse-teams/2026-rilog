import { describe, expect, it } from 'vitest';

import type { CologProfileSettingsValue } from './colog-profile-settings';

import {
	isCologProfileSettingsEqual,
	normalizeCologProfileSettings,
	validateCologProfileSettings,
} from './colog-profile-settings';

const VALID_SETTINGS: CologProfileSettingsValue = {
	name: '리로그',
	slug: 'rilog-team',
	introduction: '함께 기록하는 팀입니다.',
	logoImageUrl: '/images/profile-placeholder.svg',
	coverImageUrl: '/images/team-cover-placeholder.svg',
	serviceUrl: 'https://rilog.kr',
	githubUrl: 'https://github.com/woowacourse-teams',
	email: 'team@rilog.kr',
	logoFile: null,
	coverImageFile: null,
};

describe('validateCologProfileSettings', () => {
	it('팀 생성과 같은 이름·고유 아이디 규칙과 소개 길이 제한을 적용한다', () => {
		expect(
			validateCologProfileSettings({
				...VALID_SETTINGS,
				name: 'R',
				slug: 'Rilog_team',
				introduction: '가'.repeat(81),
			}),
		).toEqual({
			name: '팀 이름은 2~20자로 입력해 주세요.',
			slug: '고유 아이디는 4~20자의 영문 소문자, 숫자와 하이픈(-)만 사용할 수 있어요.',
			introduction: '팀 소개는 80자 이내로 입력해 주세요.',
		});
	});

	it('팀 소개와 커버 이미지는 비어 있을 수 있고 기존 로고 URL을 유효하게 판단한다', () => {
		expect(
			validateCologProfileSettings({
				...VALID_SETTINGS,
				introduction: '',
				coverImageUrl: '',
			}),
		).toEqual({});
	});

	it('로고 URL과 새 파일이 모두 없으면 필수 오류를 반환한다', () => {
		expect(
			validateCologProfileSettings({
				...VALID_SETTINGS,
				logoImageUrl: '',
				logoFile: null,
			}),
		).toEqual({ logoFile: '팀 로고를 등록해 주세요.' });
	});

	it('선택 소셜 정보는 빈 값을 허용하고 입력하면 형식을 검사한다', () => {
		expect(
			validateCologProfileSettings({
				...VALID_SETTINGS,
				serviceUrl: '',
				githubUrl: 'github',
				email: 'rilog',
			}),
		).toEqual({
			githubUrl: '올바른 GitHub URL을 입력해 주세요.',
			email: '올바른 이메일 주소를 입력해 주세요.',
		});
	});

	it('한 줄 입력값의 앞뒤 공백을 제외하고 유효성을 검사한다', () => {
		expect(
			validateCologProfileSettings({
				...VALID_SETTINGS,
				name: '  리로그  ',
				slug: '  rilog-team  ',
				serviceUrl: '  https://rilog.kr  ',
				githubUrl: '  https://github.com/woowacourse-teams  ',
				email: '  team@rilog.kr  ',
			}),
		).toEqual({});
	});
});

describe('normalizeCologProfileSettings', () => {
	it('한 줄 입력값의 앞뒤 공백만 저장 전에 정리한다', () => {
		const normalizedSettings = normalizeCologProfileSettings({
			...VALID_SETTINGS,
			name: '  리로그  ',
			slug: '  rilog  ',
			serviceUrl: '  https://rilog.kr  ',
			githubUrl: '  https://github.com/woowacourse-teams  ',
			email: '  team@rilog.kr  ',
		});

		expect(normalizedSettings).toMatchObject({
			name: '리로그',
			slug: 'rilog',
			serviceUrl: 'https://rilog.kr',
			githubUrl: 'https://github.com/woowacourse-teams',
			email: 'team@rilog.kr',
		});
	});
});

describe('isCologProfileSettingsEqual', () => {
	it('텍스트와 선택한 파일까지 같은 경우에만 동일한 설정으로 판단한다', () => {
		expect(isCologProfileSettingsEqual(VALID_SETTINGS, { ...VALID_SETTINGS })).toBe(true);
		expect(isCologProfileSettingsEqual(VALID_SETTINGS, { ...VALID_SETTINGS, name: '새 팀' })).toBe(false);
		expect(
			isCologProfileSettingsEqual(VALID_SETTINGS, {
				...VALID_SETTINGS,
				logoFile: new File(['logo'], 'logo.png', { type: 'image/png' }),
			}),
		).toBe(false);
	});
});
