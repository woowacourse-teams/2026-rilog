import { expect, it } from 'vitest';

import { safeDiagnosticQuery, safeDiagnosticUrl, safePostHogReplayUrl } from './sentry-diagnostic-privacy';

it('페이지 번호와 크기는 숫자 범위 안에서만 남기고 임의 키와 잘못된 값은 버린다', () => {
	expect(safeDiagnosticQuery('page=2&size=12&custom=private&size=private&page=12345').toString()).toBe(
		'page=2&size=12',
	);
	expect(safeDiagnosticQuery({ page: 'person@example.com', size: '12', filename: 'private.png' }).toString()).toBe(
		'size=12',
	);
});

it.each([
	['/@private-slug/posts/42?custom=private#private', '/blog/[slug]/posts/[postId]'],
	[
		'https://api.rilog.kr/v1/blogs/private-slug/posts/42?page=2#private',
		'https://api.rilog.kr/v1/blogs/[slug]/posts/42?page=2',
	],
	['https://api.rilog.kr/v1/users/private-slug', 'https://api.rilog.kr/v1/users/[slug]'],
	['https://api.rilog.kr/v1/users/me', 'https://api.rilog.kr/v1/users/me'],
	['https://api.rilog.kr/v1/uploads/private%20file.png', 'https://api.rilog.kr/v1/uploads/[value]'],
	['https://api.rilog.kr/v1/uploads/person%40example.com', 'https://api.rilog.kr/v1/uploads/[value]'],
	[
		'https://www.rilog.kr/_next/static/chunks/app-123.js?secret=private',
		'https://www.rilog.kr/_next/static/chunks/app-123.js',
	],
	['https://storage.example/private-key?X-Amz-Signature=private', null],
	['https://user:private@api.rilog.kr/v1/posts', null],
	['//evil.example/private', null],
	['javascript:private', null],
] as const)('진단 URL %s를 %s로 정제한다', (input, expected) => {
	expect(safeDiagnosticUrl(input)).toBe(expected);
});

it('replay는 실제 진단 링크 구조와 단일 timestamp만 허용한다', () => {
	expect(
		safePostHogReplayUrl('https://us.posthog.com/project/573633/replay/01234567-89ab-cdef-0123-456789abcdef?t=30'),
	).toBe('https://us.posthog.com/project/573633/replay/01234567-89ab-cdef-0123-456789abcdef?t=30');
	expect(
		safePostHogReplayUrl('https://us.posthog.com/project/573633/replay/01234567-89ab-cdef-0123-456789abcdef?t=30&t=40'),
	).toBeNull();
	expect(
		safePostHogReplayUrl(
			'https://us.posthog.com/project/573633/replay/01234567-89ab-cdef-0123-456789abcdef?custom=private',
		),
	).toBeNull();
});
