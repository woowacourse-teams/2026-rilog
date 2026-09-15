import { describe, expect, it } from 'vitest';

import { parseBlogRouteSlug } from './parse-blog-route-slug';

describe('parseBlogRouteSlug', () => {
	it.each([
		['@rilog_user', 'rilog_user'],
		['%40Rilog-01', 'Rilog-01'],
	])('%s 형식의 유효한 블로그 경로에서 slug를 반환한다', (routeSlug, expected) => {
		expect(parseBlogRouteSlug(routeSlug)).toBe(expected);
	});

	it.each(['rilog', '@abc', '@rilog.user', `@${'a'.repeat(21)}`])(
		'%s 형식의 유효하지 않은 블로그 경로를 거부한다',
		(routeSlug) => {
			expect(parseBlogRouteSlug(routeSlug)).toBeNull();
		},
	);
});
