import { expect, it, vi } from 'vitest';

import { refreshTheRilog, waitForTheRilogPage } from '../../scripts/refresh-the-rilog.mjs';

const receipt = { checksum: 'a'.repeat(64), capturedAt: '2026-10-14T21:00:00.000Z' };
const env = { THE_RILOG_REVALIDATION_SECRET: 'test-secret' };

function pageHtml(capturedAt = receipt.capturedAt) {
	return `<main data-the-rilog-input="${receipt.checksum}" data-the-rilog-captured-at="${capturedAt}">Today's articles</main>`;
}

it('같은 콘텐츠라도 새 수집 시각이 HTML에 나타난 뒤 갱신을 성공 처리한다', async () => {
	const fetchImpl = vi
		.fn<(url: URL, options: RequestInit) => Promise<Response>>()
		.mockResolvedValueOnce(new Response('Ready'))
		.mockResolvedValueOnce(Response.json(receipt, { status: 202 }))
		.mockResolvedValueOnce(new Response(pageHtml('2026-10-13T21:00:00.000Z')))
		.mockResolvedValueOnce(new Response(pageHtml()));
	const wait = vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined);

	await expect(refreshTheRilog({ env, fetchImpl, wait })).resolves.toEqual(receipt);
	expect(fetchImpl.mock.calls[1][0].href).toBe('http://127.0.0.1:3000/api/internal/the-rilog/revalidate');
	expect(fetchImpl.mock.calls[1][1]).toMatchObject({
		method: 'POST',
		headers: { Authorization: 'Bearer test-secret' },
		redirect: 'error',
	});
	expect(fetchImpl.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
	for (const [url, options] of fetchImpl.mock.calls.filter(([, requestOptions]) => requestOptions.method !== 'POST')) {
		expect(url.href).toBe('http://127.0.0.1:3000/the-rilog');
		expect(options.headers).toBeUndefined();
		expect(options.redirect).toBe('error');
		expect(options.signal).toBeInstanceOf(AbortSignal);
	}
});

it('기존 HTML만 계속 내려오면 제한 재시도 뒤 실패하고 수집 POST는 반복하지 않는다', async () => {
	const fetchImpl = vi
		.fn<(url: URL, options: RequestInit) => Promise<Response>>()
		.mockResolvedValueOnce(new Response('Ready'))
		.mockResolvedValueOnce(Response.json(receipt, { status: 202 }))
		.mockImplementation(() => Promise.resolve(new Response(pageHtml('2026-10-13T21:00:00.000Z'))));
	const wait = vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined);

	await expect(refreshTheRilog({ env, fetchImpl, wait })).rejects.toThrow('retry limit');
	expect(fetchImpl.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1);
	expect(fetchImpl.mock.calls).toHaveLength(8);
	expect(wait).toHaveBeenCalledTimes(5);
});

it.each([
	{ html: pageHtml().replace(receipt.checksum, 'b'.repeat(64)), status: 200 },
	{ html: pageHtml(), status: 500 },
])('수집 입력과 다르거나 HTTP 실패인 HTML은 성공으로 처리하지 않는다: $status', async (page) => {
	const fetchImpl = vi
		.fn<(url: URL, options: RequestInit) => Promise<Response>>()
		.mockResolvedValueOnce(new Response('Ready'))
		.mockResolvedValueOnce(Response.json(receipt, { status: 202 }))
		.mockImplementation(() => Promise.resolve(new Response(page.html, { status: page.status })));

	await expect(
		refreshTheRilog({
			env,
			fetchImpl,
			wait: vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined),
		}),
	).rejects.toThrow('retry limit');
});

it.each([401, 409, 503])('수집이 HTTP %s로 실패하면 페이지 갱신을 요청하지 않는다', async (status) => {
	const fetchImpl = vi
		.fn<(url: URL, options: RequestInit) => Promise<Response>>()
		.mockResolvedValueOnce(new Response('Ready'))
		.mockResolvedValueOnce(new Response('failure', { status }));

	await expect(refreshTheRilog({ env, fetchImpl })).rejects.toThrow(`HTTP ${status}`);
	expect(fetchImpl).toHaveBeenCalledTimes(2);
});

it('수집 응답 계약이 잘못되면 페이지 갱신을 요청하지 않는다', async () => {
	const fetchImpl = vi
		.fn<(url: URL, options: RequestInit) => Promise<Response>>()
		.mockResolvedValueOnce(new Response('Ready'))
		.mockResolvedValueOnce(Response.json({ checksum: 'invalid' }, { status: 202 }));

	await expect(refreshTheRilog({ env, fetchImpl })).rejects.toThrow('invalid receipt');
	expect(fetchImpl).toHaveBeenCalledTimes(2);
});

it('인증값이 없으면 네트워크 요청 없이 실패한다', async () => {
	const fetchImpl = vi.fn<(url: URL, options: RequestInit) => Promise<Response>>();

	await expect(refreshTheRilog({ env: {}, fetchImpl })).rejects.toThrow('required');
	expect(fetchImpl).not.toHaveBeenCalled();
});

it.each([
	'https://127.0.0.1:3000',
	'http://example.com',
	'http://127.0.0.1:3000/path',
	'http://user:password@127.0.0.1:3000',
	'http://127.0.0.1:3000?target=external',
])('기준 URL %s는 인증값 전송 전에 거부한다', async (baseUrl) => {
	const fetchImpl = vi.fn<(url: URL, options: RequestInit) => Promise<Response>>();

	await expect(
		refreshTheRilog({
			env: { ...env, THE_RILOG_REFRESH_BASE_URL: baseUrl },
			fetchImpl,
		}),
	).rejects.toThrow('loopback origin');
	expect(fetchImpl).not.toHaveBeenCalled();
});

it('스트림이 끝나기 전에는 마커가 먼저 나타나도 성공을 보고하지 않는다', async () => {
	let finishBody: (() => void) | undefined;
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode(pageHtml()));
			finishBody = () => controller.close();
		},
	});
	const fetchImpl = vi
		.fn<(url: URL, options: RequestInit) => Promise<Response>>()
		.mockResolvedValueOnce(new Response('Ready'))
		.mockResolvedValueOnce(Response.json(receipt, { status: 202 }))
		.mockResolvedValueOnce(new Response(stream));
	const finished = vi.fn();
	const refresh = refreshTheRilog({ env, fetchImpl }).then(finished);
	await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(3));
	expect(finished).not.toHaveBeenCalled();
	finishBody?.();
	await refresh;
	expect(finished).toHaveBeenCalledWith(receipt);
});

it('HTML 다운로드가 실패하면 GET만 재시도해 새 페이지를 확인한다', async () => {
	const fetchImpl = vi
		.fn<(url: URL, options: RequestInit) => Promise<Response>>()
		.mockResolvedValueOnce(new Response('Ready'))
		.mockResolvedValueOnce(Response.json(receipt, { status: 202 }))
		.mockRejectedValueOnce(new Error('Connection closed'))
		.mockResolvedValueOnce(new Response(pageHtml()));

	await expect(
		refreshTheRilog({
			env,
			fetchImpl,
			wait: vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined),
		}),
	).resolves.toEqual(receipt);
});

it('배포 준비 확인은 서버가 올라온 뒤 스냅샷 HTML을 확인하고 수집 POST를 보내지 않는다', async () => {
	const fetchImpl = vi
		.fn<(url: URL, options: RequestInit) => Promise<Response>>()
		.mockRejectedValueOnce(new Error('Connection refused'))
		.mockResolvedValueOnce(new Response(pageHtml()));

	await waitForTheRilogPage({
		receipt,
		env: {},
		fetchImpl,
		wait: vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined),
		attempts: 10,
		timeoutMs: 10_000,
	});
	for (const [url, options] of fetchImpl.mock.calls) {
		expect(url.href).toBe('http://127.0.0.1:3000/the-rilog');
		expect(options.method).toBeUndefined();
		expect(options.headers).toBeUndefined();
	}
});

it('배포 스냅샷의 입력 정보가 잘못되면 준비 확인 요청 전에 실패한다', async () => {
	const fetchImpl = vi.fn<(url: URL, options: RequestInit) => Promise<Response>>();

	await expect(waitForTheRilogPage({ receipt: {}, fetchImpl })).rejects.toThrow('invalid receipt');
	expect(fetchImpl).not.toHaveBeenCalled();
});

it('앱이 늦게 시작되면 준비를 기다린 뒤 수집 POST를 한 번 보낸다', async () => {
	const fetchImpl = vi
		.fn<(url: URL, options: RequestInit) => Promise<Response>>()
		.mockRejectedValueOnce(new Error('Connection refused'))
		.mockResolvedValueOnce(new Response('Ready'))
		.mockResolvedValueOnce(Response.json(receipt, { status: 202 }))
		.mockResolvedValueOnce(new Response(pageHtml()));
	const wait = vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined);

	await expect(refreshTheRilog({ env, fetchImpl, wait })).resolves.toEqual(receipt);
	expect(fetchImpl.mock.calls.map(([, options]) => options.method ?? 'GET')).toEqual(['GET', 'GET', 'POST', 'GET']);
	for (const [, options] of fetchImpl.mock.calls.slice(0, 2)) {
		expect(options.headers).toBeUndefined();
		expect(options.redirect).toBe('error');
	}
	expect(wait).toHaveBeenCalledTimes(1);
});

it('준비 대기 한도까지 앱이 응답하지 않으면 수집 POST 없이 실패한다', async () => {
	const fetchImpl = vi
		.fn<(url: URL, options: RequestInit) => Promise<Response>>()
		.mockImplementation(() => Promise.resolve(new Response('Not ready', { status: 503 })));

	await expect(
		refreshTheRilog({
			env,
			fetchImpl,
			wait: vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined),
		}),
	).rejects.toThrow('server did not become ready');
	expect(fetchImpl).toHaveBeenCalledTimes(6);
	for (const [, options] of fetchImpl.mock.calls) {
		expect(options.method).toBeUndefined();
		expect(options.headers).toBeUndefined();
	}
});
