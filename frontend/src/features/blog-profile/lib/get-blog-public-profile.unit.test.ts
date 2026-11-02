import ky from 'ky';
import { afterEach, expect, it, vi } from 'vitest';

import { normalizeApiError } from '@/shared/api/api-error';
import { readBlogPublicProfile } from '@/shared/api/blogs/api';
import { rememberApiRequest } from '@/shared/api/request-diagnostics';
import { shouldCaptureAutomaticError } from '@/shared/error-tracking/api-error-reporter';
import { createApiFailure } from '@/test/fixtures/api-error';

import { getBlogPublicProfile } from './get-blog-public-profile';
const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));

vi.mock('@/shared/api/blogs/api', () => ({ readBlogPublicProfile: vi.fn() }));
vi.mock('@/shared/error-tracking/error-tracker-instance', () => ({
	errorTracker: { captureException, captureMessage: vi.fn(), setUser: vi.fn() },
}));
afterEach(() => vi.clearAllMocks());
it('서버 502는 원본과 상태·요청 ID를 한 번 보고하고 같은 Error를 재전파한다', async () => {
	const failure = normalizeApiError(
		await ky
			.get('https://api.rilog.test/v1/blogs/private-slug', {
				retry: 0,
				fetch: () => Promise.resolve(new Response('Bad Gateway', { status: 502 })),
			})
			.catch((error: unknown) => error),
	);
	if (!('response' in failure)) throw new Error('Expected HTTP failure');
	failure.response.headers.set('X-Request-ID', '11111111-1111-4111-8111-111111111111');
	rememberApiRequest(failure.cause, 'GET', 'https://api.rilog.test/v1/blogs/private-slug');
	vi.mocked(readBlogPublicProfile).mockRejectedValue(failure);
	await expect(getBlogPublicProfile('example')).rejects.toBe(failure.cause);
	await expect(getBlogPublicProfile('example')).rejects.toBe(failure.cause);
	expect(captureException).toHaveBeenCalledExactlyOnceWith(failure.cause, {
		tags: {
			operation: 'blog.profile.read',
			http_status: '502',
			request_id: '11111111-1111-4111-8111-111111111111',
			user_impact: 'load_failed',
			error_kind: 'server_response',
			report_source: 'api',
		},
		contexts: {
			api_request: { method: 'GET', url: 'https://api.rilog.test/v1/blogs/private-slug' },
		},
	});
	expect(shouldCaptureAutomaticError(failure.cause)).toBe(false);
});
it('404는 null로 처리하고 보고하지 않는다', async () => {
	vi.mocked(readBlogPublicProfile).mockRejectedValue(await createApiFailure('BLOG_NOT_FOUND', 404));
	await expect(getBlogPublicProfile('missing')).resolves.toBeNull();
	expect(captureException).not.toHaveBeenCalled();
});
it('일반 Error도 명시 보고 뒤 자동 중복 수집하지 않는다', async () => {
	const error = new Error('profile failed');
	vi.mocked(readBlogPublicProfile).mockRejectedValue(error);
	await expect(getBlogPublicProfile('example')).rejects.toBe(error);
	expect(captureException).toHaveBeenCalledOnce();
	expect(captureException.mock.calls[0]?.[0]).toBe(error);
	expect(shouldCaptureAutomaticError(error)).toBe(false);
});
