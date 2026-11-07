import { expect, it, vi } from 'vitest';

import { warmPostDetailCache } from '../../scripts/warm-post-detail-cache.mjs';

const env = { NEXT_PUBLIC_API_BASE_URL: 'https://api.rilog.test' };
const post = (postId: number, slug: string) => ({ postId, owner: { slug } });

it('트렌딩·최신 글을 중복 제거하고 상세 응답을 순차적으로 기다린다', async () => {
	const firstDetail = Promise.withResolvers<Response>();
	const fetchImpl = vi.fn<(url: URL, options: RequestInit) => Promise<Response>>((url) => {
		if (url.pathname === '/feeds') return Promise.resolve(new Response('Ready'));
		if (url.pathname === '/v1/feeds/trending/posts') {
			return Promise.resolve(Response.json({ data: { posts: [post(1, 'author'), post(2, 'team')] } }));
		}
		if (url.pathname === '/v1/feeds/posts') {
			return Promise.resolve(Response.json({ data: { posts: [post(2, 'team'), post(3, 'third')] } }));
		}
		if (url.pathname === '/@author/posts/1') return firstDetail.promise;
		return Promise.resolve(new Response('Rendered'));
	});
	const wait = vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined);

	const warming = warmPostDetailCache({ env, fetchImpl, wait });
	await vi.waitFor(() =>
		expect(fetchImpl).toHaveBeenCalledWith(new URL('http://127.0.0.1:3000/@author/posts/1'), expect.anything()),
	);
	expect(fetchImpl.mock.calls.some(([url]) => url.pathname === '/@team/posts/2')).toBe(false);
	firstDetail.resolve(new Response('Rendered'));

	await expect(warming).resolves.toEqual({ ready: true, selected: 3, warmed: 3, failed: [], feedFailures: [] });
	expect(fetchImpl.mock.calls.filter(([url]) => url.pathname.includes('/posts/')).map(([url]) => url.pathname)).toEqual(
		['/@author/posts/1', '/@team/posts/2', '/@third/posts/3'],
	);
	expect(wait).toHaveBeenCalledTimes(2);
	expect(wait).toHaveBeenCalledWith(500);
});

it('피드와 상세 요청이 실패해도 나머지 글의 warming을 계속한다', async () => {
	const fetchImpl = vi.fn<(url: URL, options: RequestInit) => Promise<Response>>((url) => {
		if (url.pathname === '/feeds') return Promise.resolve(new Response('Ready'));
		if (url.pathname === '/v1/feeds/trending/posts')
			return Promise.resolve(new Response('Unavailable', { status: 503 }));
		if (url.pathname === '/v1/feeds/posts') {
			return Promise.resolve(Response.json({ data: { posts: [post(4, 'author'), post(5, 'author')] } }));
		}
		if (url.pathname === '/@author/posts/4') return Promise.resolve(new Response('Unavailable', { status: 503 }));
		return Promise.resolve(new Response('Rendered'));
	});

	await expect(warmPostDetailCache({ env, fetchImpl, wait: vi.fn().mockResolvedValue(undefined) })).resolves.toEqual({
		ready: true,
		selected: 2,
		warmed: 1,
		failed: ['/@author/posts/4: HTTP 503'],
		feedFailures: ['trending: HTTP 503'],
	});
});

it('Next 서버가 준비되지 않으면 피드와 상세 요청을 보내지 않는다', async () => {
	const fetchImpl = vi
		.fn<(url: URL, options: RequestInit) => Promise<Response>>()
		.mockRejectedValue(new Error('offline'));
	const wait = vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined);

	await expect(warmPostDetailCache({ env, fetchImpl, wait })).resolves.toEqual({
		ready: false,
		selected: 0,
		warmed: 0,
		failed: [],
		feedFailures: [],
	});
	expect(fetchImpl).toHaveBeenCalledTimes(10);
	expect(fetchImpl.mock.calls.every(([url]) => url.pathname === '/feeds')).toBe(true);
	expect(wait).toHaveBeenCalledTimes(9);
});
