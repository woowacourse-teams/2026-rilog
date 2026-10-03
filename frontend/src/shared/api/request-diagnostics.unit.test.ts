import { describe, expect, it } from 'vitest';

import { describeApiRequest, validatedApiRequestTags } from './request-diagnostics';

const base = 'https://api.rilog.test';
describe('API 요청 진단 계약', () => {
	it.each([
		['GET', '/v1/feeds/posts?keyword=private', '/v1/feeds/posts', 'feed.list'],
		['GET', '/v1/feeds/trending/posts', '/v1/feeds/trending/posts', 'feed.trending.list'],
		['GET', '/v1/blogs/private/posts/42', '/v1/blogs/[slug]/posts/[postId]', 'post.read'],
		['GET', '/v1/blogs/private/posts', '/v1/blogs/[slug]/posts', 'blog.posts.read'],
		['GET', '/v1/users/me', '/v1/users/me', 'user.me.read'],
		['GET', '/v1/users/private', '/v1/users/[slug]', 'user.read'],
		['PUT', '/v1/drafts/42/publish', '/v1/drafts/[draftId]/publish', 'draft.publish'],
		['POST', '/v1/auth/token/refresh', '/v1/auth/token/refresh', 'auth.refresh'],
		[
			'DELETE',
			'/v1/posts/42/comment-anchors/99',
			'/v1/posts/[postId]/comment-anchors/[commentAnchorId]',
			'inline-comment.delete',
		],
	])('%s %s의 고정 경로와 작업명을 보존한다', (method, path, endpoint, operation) => {
		expect(describeApiRequest(method, `${base}${path}`, base)).toEqual({ method, endpoint, operation, target: 'api' });
	});
	it('외부 URL과 알 수 없는 경로를 원문으로 전송하지 않는다', () => {
		for (const url of [
			'https://storage.test/private?signature=secret',
			`${base}/v1/unknown/private`,
			'https://evil.test/v1/users/private',
		]) {
			const data = describeApiRequest('GET', url, base);
			expect(data.endpoint).toBe('unknown');
			expect(JSON.stringify(data)).not.toMatch(/private|secret|evil/);
		}
	});
	it('잘못된 URL과 method도 원문을 남기지 않는다', () => {
		expect(describeApiRequest('private', 'https://[', base)).toMatchObject({
			method: 'OTHER',
			endpoint: 'unknown',
			operation: 'unknown',
		});
	});
	it('최종 필터가 임의 endpoint·작업명 태그를 제거한다', () => {
		expect(
			validatedApiRequestTags({
				http_method: 'GET',
				api_endpoint: '/v1/users/private',
				api_operation: 'user.read',
				api_target: 'api',
			}),
		).toEqual({});
		expect(
			validatedApiRequestTags({
				http_method: 'GET',
				api_endpoint: '/v1/users/[slug]',
				api_operation: 'user.read',
				api_target: 'api',
			}),
		).toEqual({
			http_method: 'GET',
			api_endpoint: '/v1/users/[slug]',
			api_operation: 'user.read',
			api_target: 'api',
		});
	});
});
