import { describe, expect, it } from 'vitest';

import { feedsQueryKeys } from './keys';

describe('feedsQueryKeys', () => {
	it('응답에 영향을 주는 page size를 전체 피드 query key에 포함한다', () => {
		expect(feedsQueryKeys.fullFeedPosts({ size: 12 })).toEqual(['feeds', 'posts', 'full', { size: 12 }]);
		expect(feedsQueryKeys.fullFeedPosts({ size: 24 })).not.toEqual(feedsQueryKeys.fullFeedPosts({ size: 12 }));
	});

	it('category와 blogType을 전체 피드 query key에 포함하고 미선택 값은 생략한다', () => {
		expect(feedsQueryKeys.fullFeedPosts({ size: 12, category: 'TECH', blogType: 'RILOG' })).toEqual([
			'feeds',
			'posts',
			'full',
			{ size: 12, blogType: 'RILOG', category: 'TECH' },
		]);
		expect(feedsQueryKeys.fullFeedPosts({ size: 12 })).toEqual(['feeds', 'posts', 'full', { size: 12 }]);
	});
});
