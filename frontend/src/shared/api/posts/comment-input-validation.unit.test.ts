import { expect, it } from 'vitest';

import { getInvalidCommentInputFields } from './comment-input-validation';

it.each(['', '   ', '\n', '가'.repeat(1001), '😀'.repeat(501)])(
	'빈 댓글 또는 UTF-16 길이 제한 초과는 content 필드만 반환한다',
	(content) => {
		expect(getInvalidCommentInputFields(content)).toEqual(['content']);
	},
);
it.each(['댓글', '가'.repeat(1000), '😀'.repeat(500)])('정상 댓글은 위반 필드를 반환하지 않는다', (content) => {
	expect(getInvalidCommentInputFields(content)).toEqual([]);
});
