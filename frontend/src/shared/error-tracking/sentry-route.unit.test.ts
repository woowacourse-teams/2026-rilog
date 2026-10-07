import { expect, it } from 'vitest';

import { normalizeSentryRoute } from './sentry-route';

it.each([
	['/feeds', '/feeds'],
	['/blog/[slug]', '/blog/[slug]'],
	['/blog/[slug]/posts/[postId]', '/blog/[slug]/posts/[postId]'],
	['/blog/[slug]/posts/[postId]/markdown', '/blog/[slug]/posts/[postId]/markdown'],
	['/blog/[slug]/settings', '/blog/[slug]/settings'],
	['/@private-blog', '/blog/[slug]'],
	['/@private-blog/posts/72', '/blog/[slug]/posts/[postId]'],
	['/@private-blog/posts/72/markdown', '/blog/[slug]/posts/[postId]/markdown'],
	['/@private-blog/settings', '/blog/[slug]/settings'],
])('서버 template과 클라이언트 rewrite 경로 %s를 안전한 route %s로 정규화한다', (route, expected) => {
	expect(normalizeSentryRoute(route)).toBe(expected);
});

it.each(['/feed', '/[slug]', '/[slug]/posts/[postId]', '/@private-blog/arbitrary'])(
	'존재하지 않거나 알 수 없는 route %s는 허용하지 않는다',
	(route) => {
		expect(normalizeSentryRoute(route)).toBeNull();
	},
);
