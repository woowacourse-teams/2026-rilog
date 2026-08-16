import { describe, expect, it } from 'vitest';

import type { CologCreateValue } from './colog-create';

import { normalizeCologCreateValue, validateCologCreateValue } from './colog-create';

const VALID_VALUE: CologCreateValue = {
	name: '리로그',
	slug: 'rilog-team',
	introduction: '함께 기록하는 팀입니다.',
	logoImageUrl: '/images/profile-placeholder.svg',
	coverImageUrl: '/images/team-cover-placeholder.svg',
	serviceUrl: '',
	githubUrl: '',
	email: '',
	logoFile: new File(['logo'], 'logo.png', { type: 'image/png' }),
	coverImageFile: null,
};

describe('validateCologCreateValue', () => {
	it('프로필 규칙에 팀 생성 필수 입력 규칙을 함께 적용한다', () => {
		expect(
			validateCologCreateValue({
				...VALID_VALUE,
				name: 'R',
				slug: 'Rilog_team',
				introduction: ' ',
				logoFile: null,
			}),
		).toEqual({
			name: '팀 이름은 2~20자로 입력해 주세요.',
			slug: '고유 아이디는 4~20자의 영문 소문자, 숫자와 하이픈(-)만 사용할 수 있어요.',
			introduction: '팀 소개를 입력해 주세요.',
			logoFile: '팀 로고를 등록해 주세요.',
		});
	});

	it('선택 입력은 비어 있을 수 있고 입력한 소셜 정보는 형식을 검사한다', () => {
		expect(validateCologCreateValue(VALID_VALUE)).toEqual({});
		expect(
			validateCologCreateValue({
				...VALID_VALUE,
				serviceUrl: 'rilog',
				githubUrl: 'github',
				email: 'rilog',
			}),
		).toEqual({
			serviceUrl: '올바른 서비스 URL을 입력해 주세요.',
			githubUrl: '올바른 GitHub URL을 입력해 주세요.',
			email: '올바른 이메일 주소를 입력해 주세요.',
		});
	});
});

describe('normalizeCologCreateValue', () => {
	it('제출 전에 한 줄 입력값의 앞뒤 공백을 정리한다', () => {
		expect(
			normalizeCologCreateValue({
				...VALID_VALUE,
				name: '  리로그  ',
				slug: '  rilog-team  ',
				serviceUrl: '  https://rilog.kr  ',
				githubUrl: '  ',
				email: '  team@rilog.kr  ',
			}),
		).toMatchObject({
			name: '리로그',
			slug: 'rilog-team',
			serviceUrl: 'https://rilog.kr',
			githubUrl: '',
			email: 'team@rilog.kr',
		});
	});
});
