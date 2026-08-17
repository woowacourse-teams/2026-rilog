import { describe, expect, it } from 'vitest';

import { feedsQueryKeys } from './keys';

describe('feedsQueryKeys', () => {
	it('응답에 영향을 주는 page size를 전체 피드 query key에 포함한다', () => {
		expect(feedsQueryKeys.fullFeedPosts(12)).toEqual(['feeds', 'posts', 'full', { size: 12 }]);
		expect(feedsQueryKeys.fullFeedPosts(24)).not.toEqual(feedsQueryKeys.fullFeedPosts(12));
	});
});
