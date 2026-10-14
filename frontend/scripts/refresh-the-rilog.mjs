import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const WARM_ATTEMPTS = 6;
const READY_ATTEMPTS = 6;

/** @param {unknown} value */
function readReceipt(value) {
	if (
		!value ||
		typeof value !== 'object' ||
		!('checksum' in value) ||
		typeof value.checksum !== 'string' ||
		!/^[a-f0-9]{64}$/.test(value.checksum) ||
		!('capturedAt' in value) ||
		typeof value.capturedAt !== 'string' ||
		!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value.capturedAt) ||
		!Number.isFinite(Date.parse(value.capturedAt))
	) {
		throw new Error('The Rilog capture returned an invalid receipt');
	}
	return { checksum: value.checksum, capturedAt: value.capturedAt };
}

function readBaseUrl(value = 'http://127.0.0.1:3000') {
	const url = new URL(value);
	if (
		url.protocol !== 'http:' ||
		!['127.0.0.1', '[::1]'].includes(url.hostname) ||
		url.username ||
		url.password ||
		url.pathname !== '/' ||
		url.search ||
		url.hash
	) {
		throw new Error('Refresh base URL must be an HTTP loopback origin');
	}
	return url;
}

/**
 * @param {URL} baseUrl
 * @param {(url: URL, options: RequestInit) => Promise<Response>} fetchImpl
 * @param {(milliseconds: number) => Promise<void>} wait
 */
async function waitForServer(baseUrl, fetchImpl, wait) {
	for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
		try {
			const response = await fetchImpl(new URL('/the-rilog', baseUrl), {
				redirect: 'error',
				signal: AbortSignal.timeout(5_000),
			});
			await response.text();
			if (response.ok) return;
		} catch {
			// A persistent timer may run before the app starts listening after reboot.
		}
		if (attempt + 1 < READY_ATTEMPTS) await wait(1_000);
	}
	throw new Error('The Rilog server did not become ready before the retry limit');
}

/**
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   fetchImpl?: (url: URL, options: RequestInit) => Promise<Response>,
 *   wait?: (milliseconds: number) => Promise<void>
 * }} options
 * @returns {Promise<{ checksum: string, capturedAt: string }>}
 */
export async function refreshTheRilog({ env = process.env, fetchImpl = fetch, wait = delay } = {}) {
	const secret = env.THE_RILOG_REVALIDATION_SECRET;
	if (!secret?.trim()) throw new Error('THE_RILOG_REVALIDATION_SECRET is required');
	const baseUrl = readBaseUrl(env.THE_RILOG_REFRESH_BASE_URL);
	await waitForServer(baseUrl, fetchImpl, wait);
	const response = await fetchImpl(new URL('/api/internal/the-rilog/revalidate', baseUrl), {
		method: 'POST',
		headers: { Authorization: `Bearer ${secret}` },
		redirect: 'error',
		signal: AbortSignal.timeout(90_000),
	});
	if (response.status !== 202) {
		throw new Error(`The Rilog capture failed (HTTP ${response.status})`);
	}
	const result = readReceipt(await response.json());
	await waitForTheRilogPage({ receipt: result, env, fetchImpl, wait });
	return result;
}

/**
 * @param {{
 *   receipt: unknown,
 *   env?: Record<string, string | undefined>,
 *   fetchImpl?: (url: URL, options: RequestInit) => Promise<Response>,
 *   wait?: (milliseconds: number) => Promise<void>,
 *   attempts?: number,
 *   timeoutMs?: number
 * }} options
 */
export async function waitForTheRilogPage({
	receipt,
	env = process.env,
	fetchImpl = fetch,
	wait = delay,
	attempts = WARM_ATTEMPTS,
	timeoutMs = 30_000,
}) {
	const result = readReceipt(receipt);
	const baseUrl = readBaseUrl(env.THE_RILOG_REFRESH_BASE_URL);

	// Invalidation is lazy: read the complete HTML until the newly captured input is served.
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		try {
			const page = await fetchImpl(new URL('/the-rilog', baseUrl), {
				redirect: 'error',
				signal: AbortSignal.timeout(timeoutMs),
			});
			const html = await page.text();
			if (
				page.ok &&
				html.includes(`data-the-rilog-input="${result.checksum}"`) &&
				html.includes(`data-the-rilog-captured-at="${result.capturedAt}"`)
			) {
				return;
			}
		} catch {
			// GET retries never repeat the capture POST or disclose its authorization value.
		}
		if (attempt + 1 < attempts) await wait(1_000);
	}
	throw new Error('The Rilog refresh did not serve the captured input before the retry limit');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		const result = await refreshTheRilog();
		console.info(`The Rilog refreshed: ${result.capturedAt}`);
	} catch {
		console.error('The Rilog refresh failed; check configuration, API status and server logs');
		process.exitCode = 1;
	}
}
