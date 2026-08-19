import { describe, expect, it } from 'vitest';

import type { CologCreateValue } from '../model/colog-create';

import { normalizeCologCreateValue, validateCologCreateValue } from './validate-colog-create';

const VALID_VALUE: CologCreateValue = {
	name: '리로그',
	slug: 'rilog-team',
	description: '함께 기록하는 팀입니다.',
	profileImageUrl: '/images/profile-placeholder.svg',
	coverImageUrl: '/images/team-cover-placeholder.svg',
	serviceUrl: 'https://rilog.kr',
	githubUrl: 'https://github.com/woowacourse-teams',
	logoFile: null,
	coverImageFile: null,
};

describe('validateCologCreateValue', () => {
	it('로고와 이름, 고유 아이디에 필수 입력 규칙을 적용한다', () => {
		expect(
			validateCologCreateValue({
				...VALID_VALUE,
				name: 'R',
				slug: 'Rilog_team',
				profileImageUrl: '',
				serviceUrl: '',
				githubUrl: '',
			}),
		).toEqual({
			logoFile: '팀 로고를 등록해 주세요.',
			name: '팀 이름은 2~20자로 입력해 주세요.',
			slug: '고유 아이디는 4~20자의 영문 소문자, 숫자와 하이픈(-)만 사용할 수 있어요.',
		});
	});

	it('소개와 커버 이미지는 비어 있을 수 있고 기존 로고 URL도 유효하게 판단한다', () => {
		expect(
			validateCologCreateValue({
				...VALID_VALUE,
				description: '',
				coverImageUrl: '',
			}),
		).toEqual({});
	});

	it('선택 소셜 정보는 입력했다면 형식을 검사한다', () => {
		expect(
			validateCologCreateValue({
				...VALID_VALUE,
				serviceUrl: 'rilog',
				githubUrl: 'github',
			}),
		).toEqual({
			serviceUrl: '올바른 서비스 URL을 입력해 주세요.',
			githubUrl: '올바른 GitHub URL을 입력해 주세요.',
		});
	});
});

describe('normalizeCologCreateValue', () => {
	it('제출 전에 한 줄 입력값과 기존 이미지 URL의 앞뒤 공백을 정리한다', () => {
		expect(
			normalizeCologCreateValue({
				...VALID_VALUE,
				name: '  리로그  ',
				slug: '  rilog-team  ',
				profileImageUrl: '  https://cdn.rilog.kr/logo.png  ',
				serviceUrl: '  https://rilog.kr  ',
				githubUrl: '  https://github.com/woowacourse-teams  ',
			}),
		).toMatchObject({
			name: '리로그',
			slug: 'rilog-team',
			profileImageUrl: 'https://cdn.rilog.kr/logo.png',
			serviceUrl: 'https://rilog.kr',
			githubUrl: 'https://github.com/woowacourse-teams',
		});
	});
});
