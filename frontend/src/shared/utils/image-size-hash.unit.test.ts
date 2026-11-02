import { describe, expect, it } from 'vitest';

import { parseImageSizeHash } from './image-size-hash';

describe('parseImageSizeHash', () => {
	it('크기 해시를 URL과 양의 정수 크기로 분리한다', () => {
		expect(parseImageSizeHash('posts/cover.png#1200x800')).toEqual({
			url: 'posts/cover.png',
			width: 1200,
			height: 800,
		});
	});

	it.each([
		'posts/cover.png',
		'posts/cover.png#0x800',
		'posts/cover.png#1200x0',
		'posts/cover.png#bad',
		'posts/cover.png#99999999999999999999x1',
	])('크기 정보가 유효하지 않으면 해석하지 않는다: %s', (url) => {
		expect(parseImageSizeHash(url)).toBeNull();
	});
});
