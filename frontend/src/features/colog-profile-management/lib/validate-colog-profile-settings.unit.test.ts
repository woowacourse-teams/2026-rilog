import { describe, expect, it } from 'vitest';

import type { CologProfileSettingsValue } from '../model/colog-profile-settings';

import {
	isCologProfileSettingsEqual,
	normalizeCologProfileSettings,
	validateCologProfileSettings,
} from './validate-colog-profile-settings';

const VALID_SETTINGS: CologProfileSettingsValue = {
	name: '리로그',
	slug: 'rilog_team',
	description: '함께 기록하는 팀입니다.',
	profileImageUrl: '/images/profile-placeholder.svg',
	coverImageUrl: '',
	serviceUrl: 'https://www.rilog.kr',
	githubUrl: 'https://github.com/woowacourse-teams',
	logoFile: null,
	coverImageFile: null,
};

describe('validateCologProfileSettings', () => {
	it('팀 생성과 같은 이름·고유 아이디 규칙과 소개 길이 제한을 적용한다', () => {
		expect(
			validateCologProfileSettings({
				...VALID_SETTINGS,
				name: 'R',
				slug: 'Rilog.team',
				description: '가'.repeat(81),
			}),
		).toEqual({
			name: '팀 이름은 2~20자로 입력해 주세요.',
			slug: '고유 아이디는 4~20자의 영어 소문자와 숫자, 언더스코어(_)만 사용할 수 있어요.',
			description: '팀 소개는 80자 이내로 입력해 주세요.',
		});
	});

	it('팀 소개와 커버 이미지는 비어 있을 수 있고 기존 로고 URL을 유효하게 판단한다', () => {
		expect(
			validateCologProfileSettings({
				...VALID_SETTINGS,
				description: '',
				coverImageUrl: '',
			}),
		).toEqual({});
	});

	it('언더스코어가 포함된 기존 팀 고유 아이디로 프로필을 저장할 수 있다', () => {
		expect(validateCologProfileSettings({ ...VALID_SETTINGS, slug: 'rilog_team' })).toEqual({});
	});

	it('하이픈이 있거나 영문이 없는 팀 고유 아이디를 거부한다', () => {
		expect(validateCologProfileSettings({ ...VALID_SETTINGS, slug: 'rilog-team' })).toHaveProperty(
			'slug',
			'고유 아이디는 4~20자의 영어 소문자와 숫자, 언더스코어(_)만 사용할 수 있어요.',
		);
		expect(validateCologProfileSettings({ ...VALID_SETTINGS, slug: '1234_' })).toHaveProperty(
			'slug',
			'고유 아이디에 영어를 1자 이상 포함해 주세요.',
		);
	});

	it('로고 URL과 새 파일이 모두 없으면 기본 이미지 사용으로 판단한다', () => {
		expect(
			validateCologProfileSettings({
				...VALID_SETTINGS,
				profileImageUrl: '',
				logoFile: null,
			}),
		).toEqual({});
	});

	it('선택 소셜 정보는 빈 값을 허용하고 입력하면 형식을 검사한다', () => {
		expect(
			validateCologProfileSettings({
				...VALID_SETTINGS,
				serviceUrl: '',
				githubUrl: 'github',
			}),
		).toEqual({
			githubUrl: '올바른 GitHub URL을 입력해 주세요.',
		});
	});

	it('소셜 링크 길이 제한을 적용한다', () => {
		expect(
			validateCologProfileSettings({
				...VALID_SETTINGS,
				serviceUrl: `https://${'a'.repeat(505)}`,
				githubUrl: `https://${'b'.repeat(505)}`,
			}),
		).toEqual({
			serviceUrl: '서비스 링크는 512자 이하로 입력해 주세요.',
			githubUrl: 'GitHub 링크는 512자 이하로 입력해 주세요.',
		});
	});

	it('한 줄 입력값의 앞뒤 공백을 제외하고 유효성을 검사한다', () => {
		expect(
			validateCologProfileSettings({
				...VALID_SETTINGS,
				name: '  리로그  ',
				slug: '  rilog_team  ',
				serviceUrl: '  https://www.rilog.kr  ',
				githubUrl: '  https://github.com/woowacourse-teams  ',
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
			serviceUrl: '  https://www.rilog.kr  ',
			githubUrl: '  https://github.com/woowacourse-teams  ',
		});

		expect(normalizedSettings).toMatchObject({
			name: '리로그',
			slug: 'rilog',
			serviceUrl: 'https://www.rilog.kr',
			githubUrl: 'https://github.com/woowacourse-teams',
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
