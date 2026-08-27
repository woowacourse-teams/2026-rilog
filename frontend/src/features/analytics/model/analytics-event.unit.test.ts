import { describe, expect, it } from 'vitest';

import { getBlockCountBucket } from './analytics-event';

describe('getBlockCountBucket', () => {
	it.each([
		[1, '1-5'],
		[5, '1-5'],
		[6, '6-10'],
		[10, '6-10'],
		[11, '11-20'],
		[20, '11-20'],
		[21, '21+'],
	] as const)('블록 %i개를 %s 구간으로 분류한다', (count, bucket) => {
		expect(getBlockCountBucket(count)).toBe(bucket);
	});
});
