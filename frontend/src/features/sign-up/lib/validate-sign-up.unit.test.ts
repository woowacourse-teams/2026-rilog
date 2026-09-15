import { describe, expect, it } from 'vitest';

import { normalizeSignUpFields, validateSignUpFields } from './validate-sign-up';

const VALID_FIELDS = {
	nickname: '리로그',
	slug: 'Ri__log_01',
	serviceUrl: '',
	githubUrl: '',
};

describe('validateSignUpFields', () => {
	it('닉네임은 문자 종류와 관계없이 2~20자를 허용한다', () => {
		expect(validateSignUpFields({ ...VALID_FIELDS, nickname: '리!로그' })).toEqual({});
	});

	it('고유 아이디가 slug 정책에 맞지 않으면 오류를 반환한다', () => {
		expect(validateSignUpFields({ ...VALID_FIELDS, slug: 'ri-log' })).toEqual({
			slug: '고유 아이디는 4~20자의 영문, 숫자, 언더스코어(_)만 사용할 수 있고 영문을 1자 이상 포함해야 해요.',
		});
		expect(validateSignUpFields({ ...VALID_FIELDS, slug: '____99' })).toEqual({
			slug: '고유 아이디는 4~20자의 영문, 숫자, 언더스코어(_)만 사용할 수 있고 영문을 1자 이상 포함해야 해요.',
		});
	});

	it('앞뒤 공백을 제거한 값이 길이 규칙을 충족하지 못하면 오류를 반환한다', () => {
		expect(validateSignUpFields({ ...VALID_FIELDS, nickname: ' 리 ', slug: ' abc ' })).toEqual({
			nickname: '닉네임은 2~20자로 입력해 주세요.',
			slug: '고유 아이디는 4~20자의 영문, 숫자, 언더스코어(_)만 사용할 수 있고 영문을 1자 이상 포함해야 해요.',
		});
	});

	it('선택 링크가 있으면 HTTP URL 형식을 검증한다', () => {
		expect(validateSignUpFields({ ...VALID_FIELDS, serviceUrl: 'rilog.kr', githubUrl: 'github' })).toEqual({
			serviceUrl: '올바른 서비스 URL을 입력해 주세요.',
			githubUrl: '올바른 GitHub URL을 입력해 주세요.',
		});
	});

	it('HTTP URL 형식의 선택 링크를 허용한다', () => {
		expect(
			validateSignUpFields({
				...VALID_FIELDS,
				serviceUrl: 'https://rilog.kr',
				githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
			}),
		).toEqual({});
	});
});

describe('normalizeSignUpFields', () => {
	it('API 요청 전에 텍스트 필드의 앞뒤 공백을 제거한다', () => {
		expect(
			normalizeSignUpFields({
				nickname: '  리로그  ',
				slug: '  rilog  ',
				serviceUrl: '  https://rilog.kr  ',
				githubUrl: '  https://github.com/rilog  ',
			}),
		).toEqual({
			nickname: '리로그',
			slug: 'rilog',
			serviceUrl: 'https://rilog.kr',
			githubUrl: 'https://github.com/rilog',
		});
	});
});
