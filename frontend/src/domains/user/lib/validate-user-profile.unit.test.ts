import { describe, expect, it } from 'vitest';

import {
	normalizeUserNickname,
	normalizeUserSlug,
	USER_SLUG_PATTERN,
	validateUserNickname,
	validateUserSlug,
} from './validate-user-profile';

describe('user profile validation', () => {
	it('닉네임과 slug의 앞뒤 공백을 제거한다', () => {
		expect(normalizeUserNickname('  리로그  ')).toBe('리로그');
		expect(normalizeUserSlug('  Ri__log_01  ')).toBe('Ri__log_01');
	});

	it('회원가입과 같은 닉네임 및 slug 규칙을 적용한다', () => {
		expect(validateUserNickname('리!로그')).toBeUndefined();
		expect(validateUserNickname(' 리 ')).toBe('닉네임은 2~20자로 입력해 주세요.');
		expect(validateUserSlug('Ri__log_01')).toBeUndefined();
		expect(validateUserSlug('ri-log')).toBe(
			'고유 아이디는 4~20자의 영문, 숫자, 언더스코어(_)만 사용할 수 있고 영문을 1자 이상 포함해야 해요.',
		);
		expect(validateUserSlug('____99')).toBe(
			'고유 아이디는 4~20자의 영문, 숫자, 언더스코어(_)만 사용할 수 있고 영문을 1자 이상 포함해야 해요.',
		);
	});

	it('slug pattern은 최신 브라우저의 v 플래그 정규식으로 사용할 수 있다', () => {
		expect(() => new RegExp(USER_SLUG_PATTERN, 'v')).not.toThrow();
	});
});
