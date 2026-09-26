import { expect, it } from 'vitest';

import { getInvalidCologInputFields } from './input-validation';

it('Co-log 사용자 텍스트 제약 위반만 확인하고 앱이 생성하는 이미지 참조는 제외한다', () => {
	expect(
		getInvalidCologInputFields({
			name: 'team',
			slug: 'valid_team',
			introduction: 'x'.repeat(81),
			profileImageUrl: 'x'.repeat(513),
		}),
	).toEqual(['introduction']);
	expect(getInvalidCologInputFields({ name: 'x'.repeat(21), slug: '!', serviceUrl: 'x'.repeat(513) })).toEqual([
		'name',
		'slug',
		'serviceUrl',
	]);
	expect(getInvalidCologInputFields({ name: 'team', slug: 'valid_team' })).toEqual([]);
});
