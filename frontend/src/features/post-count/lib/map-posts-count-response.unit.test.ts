import { describe, expect, it } from 'vitest';

import { mapPostsCountResponse } from './map-posts-count-response';

describe('mapPostsCountResponse', () => {
	it('API 응답에서 전체 포스트 개수를 추출한다', () => {
		const response = {
			status: 200,
			message: 'OK',
			data: {
				totalPostsCount: 42,
			},
		};

		const result = mapPostsCountResponse(response);

		expect(result).toEqual({ totalPostsCount: 42 });
	});

	it('data가 없으면 0개로 반환한다', () => {
		const response = {
			status: 200,
			message: 'OK',
			data: undefined,
		};

		const result = mapPostsCountResponse(response);

		expect(result).toEqual({ totalPostsCount: 0 });
	});
});
