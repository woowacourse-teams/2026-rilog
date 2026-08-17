import { describe, expect, it } from 'vitest';

import { keys } from './keys';

describe('feedsKeys', () => {
	it('응답에 영향을 주는 page size를 전체 피드 query key에 포함한다', () => {
		expect(keys.fullPosts(12)).toEqual(['feeds', 'posts', 'full', { size: 12 }]);
		expect(keys.fullPosts(24)).not.toEqual(keys.fullPosts(12));
	});
});
