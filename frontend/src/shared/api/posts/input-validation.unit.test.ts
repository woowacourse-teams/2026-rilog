import { expect, it } from 'vitest';

import { getInvalidPostInputFields } from './input-validation';

it('제목 문자열이 실제 길이 제약을 위반한 경우만 사용자 입력 오류로 확인한다', () => {
	expect(getInvalidPostInputFields('a'.repeat(513))).toEqual(['title']);
	expect(getInvalidPostInputFields('  ')).toEqual(['title']);
	expect(getInvalidPostInputFields('a'.repeat(512))).toEqual([]);
	for (const missing of [undefined, null, 123]) expect(getInvalidPostInputFields(missing)).toEqual([]);
});
