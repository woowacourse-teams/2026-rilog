/** Sentry에 허용하는 공개 요청 템플릿. 원본 URL·query·host는 반환하지 않는다. */
const ENDPOINTS = [
	['GET', '/v1/feeds/posts', 'feed.list'],
	['GET', '/v1/feeds/trending/posts', 'feed.trending.list'],
	['GET', '/v1/blogs/[slug]/posts/[postId]', 'post.read'],
	['GET', '/v1/blogs/[slug]/posts', 'blog.posts.read'],
	['GET', '/v1/blogs/[slug]/index', 'blog.index.read'],
	['GET', '/v1/blogs/[slug]/chapters', 'blog.chapters.read'],
	['POST', '/v1/blogs/[slug]/chapters', 'blog.chapter.create'],
	['PATCH', '/v1/blogs/[slug]/chapters/[chapterId]', 'blog.chapter.update'],
	['DELETE', '/v1/blogs/[slug]/chapters/[chapterId]', 'blog.chapter.delete'],
	['GET', '/v1/blogs/[slug]', 'blog.profile.read'],
	['PATCH', '/v1/blogs/[slug]/profiles', 'blog.profile.update'],
	['GET', '/v1/users/me/cologs/overview', 'user.cologs.read'],
	['GET', '/v1/users/me', 'user.me.read'],
	['PATCH', '/v1/users/me/onboarding', 'user.onboarding'],
	['GET', '/v1/users/[slug]', 'user.read'],
	['GET', '/v1/posts/count', 'post.count.read'],
	['POST', '/v1/posts', 'post.publish'],
	['PUT', '/v1/posts/[postId]', 'post.update'],
	['DELETE', '/v1/posts/[postId]', 'post.delete'],
	['GET', '/v1/posts/[postId]/comment-anchors', 'inline-comment.list'],
	['GET', '/v1/posts/[postId]/comment-anchors/sidebar', 'inline-comment.sidebar.read'],
	['POST', '/v1/posts/[postId]/comment-anchors', 'inline-comment.create'],
	['POST', '/v1/posts/[postId]/selections/[selectionId]/comment-anchors', 'inline-comment.add'],
	['PATCH', '/v1/posts/[postId]/comment-anchors/[commentAnchorId]', 'inline-comment.update'],
	['DELETE', '/v1/posts/[postId]/comment-anchors/[commentAnchorId]', 'inline-comment.delete'],
	['POST', '/v1/drafts', 'draft.save'],
	['GET', '/v1/drafts/me', 'draft.list'],
	['GET', '/v1/drafts/[draftId]', 'draft.read'],
	['PUT', '/v1/drafts/[draftId]', 'draft.overwrite'],
	['DELETE', '/v1/drafts/[draftId]', 'draft.delete'],
	['PUT', '/v1/drafts/[draftId]/publish', 'draft.publish'],
	['POST', '/v1/auth/github/callback', 'oauth.callback'],
	['POST', '/v1/auth/logout', 'auth.logout'],
	['POST', '/v1/auth/token/refresh', 'auth.refresh'],
	['POST', '/v1/uploads/presigned-url', 'upload.presign'],
	['POST', '/v1/cologs', 'colog.create'],
	['DELETE', '/v1/cologs/[slug]', 'colog.delete'],
	['POST', '/v1/cologs/[slug]/members', 'colog.invite'],
	['GET', '/v1/cologs/[slug]/members', 'colog.members.read'],
	['DELETE', '/v1/cologs/[slug]/members/me', 'colog.leave'],
	['DELETE', '/v1/cologs/[slug]/members/[memberId]', 'colog.member.remove'],
	['GET', '/v1/availability/slug', 'availability.slug'],
	['GET', '/v1/availability/nickname', 'availability.nickname'],
] as const;

export interface ApiRequestDiagnostics {
	method: string;
	endpoint: string;
	operation: string;
	target: 'api' | 'storage' | 'unknown';
}

const requests = new WeakMap<object, ApiRequestDiagnostics>();

export function rememberApiRequest(error: unknown, method: string, url: string, baseUrl?: string): void {
	if (typeof error === 'object' && error !== null) requests.set(error, describeApiRequest(method, url, baseUrl));
}

export function getApiRequestDiagnostics(error: unknown): ApiRequestDiagnostics | undefined {
	return typeof error === 'object' && error !== null ? requests.get(error) : undefined;
}

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

function matchesTemplate(path: string, template: string): boolean {
	const actual = path.split('/');
	const expected = template.split('/');
	return (
		actual.length === expected.length &&
		expected.every((part, index) =>
			part.startsWith('[') && part.endsWith(']')
				? Boolean(actual[index]) && !/%2f|%5c/i.test(actual[index] ?? '')
				: part === actual[index],
		)
	);
}

export function describeApiRequest(method: string, url: string, baseUrl?: string): ApiRequestDiagnostics {
	const safeMethod = METHODS.has(method.toUpperCase()) ? method.toUpperCase() : 'OTHER';
	const fallback: ApiRequestDiagnostics = {
		method: safeMethod,
		endpoint: 'unknown',
		operation: 'unknown',
		target: 'unknown',
	};
	try {
		if (!baseUrl) return fallback;
		const base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
		const request = new URL(url, base);
		if (request.origin !== base.origin || !request.pathname.startsWith('/v1/')) return fallback;
		const entry = ENDPOINTS.find(
			([entryMethod, template]) => entryMethod === safeMethod && matchesTemplate(request.pathname, template),
		);
		return entry ? { method: safeMethod, endpoint: entry[1], operation: entry[2], target: 'api' } : fallback;
	} catch {
		return fallback;
	}
}

export function describeStorageUpload(): ApiRequestDiagnostics {
	return { method: 'PUT', endpoint: 'storage/[objectKey]', operation: 'upload.put', target: 'storage' };
}

/** 최종 필터에서 임의 태그를 신뢰하지 않고 고정 계약으로 재검증한다. */
export function validatedApiRequestTags(tags: Record<string, unknown> | undefined): Record<string, string> {
	const method = tags?.http_method;
	const endpoint = tags?.api_endpoint;
	const operation = tags?.api_operation;
	const target = tags?.api_target;
	if (target === 'storage' && method === 'PUT' && endpoint === 'storage/[objectKey]' && operation === 'upload.put') {
		return { http_method: method, api_endpoint: endpoint, api_operation: operation, api_target: target };
	}
	if (target !== 'api' || typeof method !== 'string' || typeof endpoint !== 'string') return {};
	const matched = ENDPOINTS.find(
		([entryMethod, entryEndpoint]) => entryMethod === method && entryEndpoint === endpoint,
	);
	return matched && operation === matched[2]
		? { http_method: method, api_endpoint: endpoint, api_operation: matched[2], api_target: 'api' }
		: {};
}
