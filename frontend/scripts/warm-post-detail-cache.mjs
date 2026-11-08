import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const SITE_ORIGIN = 'http://127.0.0.1:3000';
const POSTS_PER_FEED = 8;
const READY_ATTEMPTS = 10;
const WARM_INTERVAL_MS = 500;
const FEEDS = [
	{ name: 'trending', path: 'v1/feeds/trending/posts' },
	{ name: 'latest', path: 'v1/feeds/posts' },
];

/** @param {unknown} value */
function getPostPath(value) {
	if (value === null || typeof value !== 'object') return null;
	const post = /** @type {{ postId?: unknown, owner?: { slug?: unknown } }} */ (value);
	const slug = typeof post.owner?.slug === 'string' ? post.owner.slug.replace(/^@/, '').trim() : '';
	if (slug === '' || typeof post.postId !== 'number' || !Number.isSafeInteger(post.postId) || post.postId < 1) {
		return null;
	}
	return `/@${encodeURIComponent(slug)}/posts/${post.postId}`;
}

/**
 * @param {(url: URL, options: RequestInit) => Promise<Response>} fetchImpl
 * @param {(milliseconds: number) => Promise<void>} wait
 */
async function waitForServer(fetchImpl, wait) {
	for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
		try {
			const response = await fetchImpl(new URL('/feeds', SITE_ORIGIN), {
				redirect: 'error',
				signal: AbortSignal.timeout(3_000),
			});
			await response.arrayBuffer();
			if (response.ok) return true;
		} catch {
			// PM2 reload 직후 서버가 아직 요청을 받지 못할 수 있다.
		}
		if (attempt + 1 < READY_ATTEMPTS) await wait(1_000);
	}
	return false;
}

/**
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   fetchImpl?: (url: URL, options: RequestInit) => Promise<Response>,
 *   wait?: (milliseconds: number) => Promise<void>
 * }} options
 */
export async function warmPostDetailCache({ env = process.env, fetchImpl = fetch, wait = delay } = {}) {
	/** @type {{ ready: boolean, selected: number, warmed: number, failed: string[], feedFailures: string[] }} */
	const result = { ready: false, selected: 0, warmed: 0, failed: [], feedFailures: [] };
	if (!(await waitForServer(fetchImpl, wait))) return result;
	result.ready = true;

	const apiBase = env.NEXT_PUBLIC_API_BASE_URL?.trim();
	if (!apiBase) {
		result.feedFailures.push('API base URL is missing');
		return result;
	}

	const paths = new Set();
	for (const feed of FEEDS) {
		try {
			const endpoint = new URL(`${feed.path}?page=0&size=${POSTS_PER_FEED}`, `${apiBase.replace(/\/$/, '')}/`);
			const response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(5_000) });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const body = await response.json();
			if (!Array.isArray(body?.data?.posts)) throw new Error('invalid response');
			for (const post of body.data.posts.slice(0, POSTS_PER_FEED)) {
				const path = getPostPath(post);
				if (path !== null) paths.add(path);
			}
		} catch (error) {
			result.feedFailures.push(`${feed.name}: ${error instanceof Error ? error.message : 'request failed'}`);
		}
	}

	result.selected = paths.size;
	const selectedPaths = [...paths];
	for (const [index, path] of selectedPaths.entries()) {
		try {
			const response = await fetchImpl(new URL(path, SITE_ORIGIN), {
				redirect: 'error',
				signal: AbortSignal.timeout(10_000),
			});
			await response.arrayBuffer();
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			result.warmed += 1;
		} catch (error) {
			result.failed.push(`${path}: ${error instanceof Error ? error.message : 'request failed'}`);
		}
		if (index + 1 < selectedPaths.length) await wait(WARM_INTERVAL_MS);
	}
	return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		const result = await warmPostDetailCache();
		console.info(
			`Post detail cache warm-up: selected=${result.selected}, warmed=${result.warmed}, failed=${result.failed.length}`,
		);
		if (!result.ready) console.warn('Post detail cache warm-up skipped: Next server was not ready');
		for (const failure of result.feedFailures) console.warn(`Post detail cache warm-up feed failed: ${failure}`);
		for (const failure of result.failed) console.warn(`Post detail cache warm-up request failed: ${failure}`);
	} catch (error) {
		console.error('Post detail cache warm-up failed unexpectedly', error);
		process.exitCode = 1;
	}
}
