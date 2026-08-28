import { describe, expect, it } from 'vitest';

import type { RilogProfileSettingsValue } from '../model/rilog-profile-settings';

import {
	isRilogProfileSettingsEqual,
	normalizeRilogProfileSettings,
	validateRilogProfileSettings,
} from './validate-rilog-profile-settings';

const VALID_VALUE: RilogProfileSettingsValue = {
	nickname: '리로거',
	slug: 'rilogger',
	description: '기록하고 성장하는 개발자입니다.',
	profileImageUrl: '',
	serviceUrl: 'https://rilog.kr',
	githubUrl: 'https://github.com/rilog',
	profileImageFile: null,
};

describe('validateRilogProfileSettings', () => {
	it('회원가입 닉네임과 공통 HTTP(S) URL 규칙을 적용한다', () => {
		expect(
			validateRilogProfileSettings({
				...VALID_VALUE,
				nickname: ' 리 ',
				serviceUrl: 'rilog.kr',
				githubUrl: 'github.com/rilog',
			}),
		).toEqual({
			nickname: '닉네임은 2~20자로 입력해 주세요.',
			serviceUrl: '올바른 서비스 URL을 입력해 주세요.',
			githubUrl: '올바른 GitHub URL을 입력해 주세요.',
		});
	});

	it('소개 길이 제한을 적용한다', () => {
		expect(validateRilogProfileSettings({ ...VALID_VALUE, description: '가'.repeat(81) })).toEqual({
			description: '소개는 80자 이내로 입력해 주세요.',
		});
	});

	it('소셜 링크 길이 제한을 적용한다', () => {
		expect(
			validateRilogProfileSettings({
				...VALID_VALUE,
				serviceUrl: `https://${'a'.repeat(505)}`,
				githubUrl: `https://${'b'.repeat(505)}`,
			}),
		).toEqual({
			serviceUrl: '서비스 링크는 512자 이하로 입력해 주세요.',
			githubUrl: 'GitHub 링크는 512자 이하로 입력해 주세요.',
		});
	});
});

describe('normalizeRilogProfileSettings', () => {
	it('저장 전에 텍스트 필드의 앞뒤 공백을 정리한다', () => {
		expect(
			normalizeRilogProfileSettings({
				...VALID_VALUE,
				nickname: '  리로거  ',
				description: '  소개  ',
				serviceUrl: '  https://rilog.kr  ',
			}),
		).toMatchObject({ nickname: '리로거', description: '소개', serviceUrl: 'https://rilog.kr' });
	});
});

describe('isRilogProfileSettingsEqual', () => {
	it('선택한 프로필 이미지 파일까지 같을 때만 같은 값으로 판단한다', () => {
		expect(isRilogProfileSettingsEqual(VALID_VALUE, { ...VALID_VALUE })).toBe(true);
		expect(isRilogProfileSettingsEqual(VALID_VALUE, { ...VALID_VALUE, nickname: '새 리로거' })).toBe(false);
	});
});
