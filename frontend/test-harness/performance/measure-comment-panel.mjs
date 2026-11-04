import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import { chromium } from '@playwright/test';

const args = Object.fromEntries(
	process.argv.slice(2).map((v) => {
		const i = v.indexOf('=');
		return [v.slice(2, i), v.slice(i + 1)];
	}),
);
if (!args.a || !args.fixture || !args.output)
	throw new Error(
		'Required: --a=URL --fixture=FILE --output=DIR [--b=URL --blocks=10 --cpu=4 --width=1440 --warmup=2]',
	);
const fixtureText = await readFile(args.fixture, 'utf8'),
	fixture = JSON.parse(fixtureText),
	directory = resolve(args.output);
await mkdir(directory, { recursive: true, mode: 0o700 });
const cpu = Number(args.cpu ?? 4),
	width = Number(args.width ?? 1440),
	blocks = Number(args.blocks ?? 10);
if (
	![cpu, width, blocks].every(Number.isFinite) ||
	cpu < 1 ||
	width < 1280 ||
	!Number.isInteger(blocks) ||
	blocks < 1
) {
	throw new Error('CPU >= 1, desktop width >= 1280, and positive integer blocks are required');
}
function sanitizeTrace(value, key = '') {
	if (/authorization|cookie|headers|postData|password|secret|token/i.test(key)) return '[redacted]';
	if (Array.isArray(value)) return value.map((item) => sanitizeTrace(item));
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, sanitizeTrace(item, name)]));
	}
	if (typeof value === 'string' && /^https?:\/\//.test(value)) {
		const url = new URL(value);
		url.search = '';
		url.hash = '';
		return url.href;
	}
	return value;
}
const browser = await chromium.launch({ headless: true });
const targets = { A: args.a, ...(args.b ? { B: args.b } : {}) },
	pages = {},
	records = [];
function unionDuration(intervals) {
	let sum = 0,
		end = -Infinity;
	for (const [a, b] of intervals.sort((a, b) => a[0] - b[0]))
		if (b > end) {
			sum += b - Math.max(a, end);
			end = b;
		}
	return sum / 1000;
}
try {
	for (const [label, origin] of Object.entries(targets)) {
		const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' }),
			page = await context.newPage();
		await page.route('https://api.rilog.test/**', async (route) => {
			const req = route.request(),
				url = new URL(req.url());
			url.searchParams.sort();
			const item = req.method() === 'GET' ? fixture.api[url.pathname + url.search] : null;
			return route.fulfill({ status: item?.status ?? 401, contentType: 'application/json', body: item?.body ?? '{}' });
		});
		await page.goto(new URL('/@jetproc/posts/246', origin).href);
		if (label === 'B' && args['css-b']) {
			await page.addStyleTag({ content: await readFile(args['css-b'], 'utf8') });
		}
		await page.getByRole('button', { name: '전체 댓글 26개 보기', exact: true }).waitFor();
		await page.evaluate(async () => {
			await document.fonts.ready;
			await Promise.all(
				[...document.images].filter((i) => i.loading !== 'lazy').map((i) => i.decode().catch(() => {})),
			);
		});
		await page.waitForTimeout(1000);
		const cdp = await context.newCDPSession(page);
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
		pages[label] = { page, cdp };
	}
	async function run(label, block, order, warmup = false) {
		const { page, cdp } = pages[label];
		await page.bringToFront();
		await page.evaluate(() => document.querySelector('button[aria-label^="전체 댓글"]').focus({ preventScroll: true }));
		if (warmup) {
			await page.evaluate(async () => {
				document.querySelector('button[aria-label^="전체 댓글"]').click();
				await new Promise((r) => setTimeout(r, 700));
				document.querySelector('button[aria-label="댓글 사이드바 닫기"]').click();
				await new Promise((r) => setTimeout(r, 1400));
			});
			return;
		}
		const events = [],
			collect = (e) => events.push(...e.value);
		cdp.on('Tracing.dataCollected', collect);
		const complete = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
		await cdp.send('Tracing.start', {
			categories: 'devtools.timeline,blink.user_timing',
			transferMode: 'ReportEvents',
		});
		const observed = await page.evaluate(async () => {
			const phases = {},
				frames = [],
				longTasks = [],
				focusEvents = [];
			let active = true,
				last;
			const tick = (ts) => {
				if (last !== undefined) frames.push({ at: ts, duration: ts - last });
				last = ts;
				if (active) requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
			const observer = new PerformanceObserver((l) =>
				longTasks.push(...l.getEntries().map((e) => ({ at: e.startTime, duration: e.duration }))),
			);
			observer.observe({ type: 'longtask' });
			const focus = () =>
				focusEvents.push({
					at: performance.now(),
					opener: document.activeElement?.getAttribute('aria-label')?.startsWith('전체 댓글') ?? false,
				});
			document.addEventListener('focusin', focus);
			phases.start = performance.now();
			performance.mark('comment-perf:start');
			document.querySelector('button[aria-label^="전체 댓글"]').click();
			await new Promise((r) => setTimeout(r, 700));
			phases.close = performance.now();
			performance.mark('comment-perf:close');
			document.querySelector('button[aria-label="댓글 사이드바 닫기"]').click();
			await new Promise((r) => setTimeout(r, 700));
			phases.tail = performance.now();
			performance.mark('comment-perf:tail');
			await new Promise((r) => setTimeout(r, 700));
			phases.end = performance.now();
			performance.mark('comment-perf:end');
			active = false;
			longTasks.push(...observer.takeRecords().map((e) => ({ at: e.startTime, duration: e.duration })));
			observer.disconnect();
			document.removeEventListener('focusin', focus);
			return {
				phases,
				frames,
				longTasks,
				focusEvents,
				visibility: document.visibilityState,
				focusRestored: document.activeElement?.getAttribute('aria-label')?.startsWith('전체 댓글') ?? false,
				closed: document.querySelector('[role="region"][data-state="open"]') === null,
				blocks: document.querySelectorAll('[data-post-detail-content] .bn-block-outer').length,
				pendingAnimations: document.getAnimations().filter((animation) => animation.playState === 'running').length,
			};
		});
		await cdp.send('Tracing.end');
		await complete;
		cdp.off('Tracing.dataCollected', collect);
		const markers = Object.fromEntries(
			events.filter((e) => e.name?.startsWith('comment-perf:')).map((e) => [e.name.slice(13), e]),
		);
		if (!markers.start || !markers.end) throw new Error('Trace markers missing');
		const main = events.filter((e) => e.ph === 'X' && e.pid === markers.start.pid && e.tid === markers.start.tid),
			metrics = {};
		for (const [phase, from, to] of [
			['open', 'start', 'close'],
			['close', 'close', 'tail'],
			['tail', 'tail', 'end'],
			['whole', 'start', 'end'],
		]) {
			const a = markers[from].ts,
				b = markers[to].ts,
				spans = main
					.filter((e) => ['Layout', 'UpdateLayoutTree'].includes(e.name))
					.map((e) => [Math.max(a, e.ts), Math.min(b, e.ts + e.dur)])
					.filter(([s, e]) => e > s),
				tasks = observed.longTasks.filter((e) => e.at >= observed.phases[from] && e.at < observed.phases[to]);
			metrics[phase] = {
				styleLayoutMs: unionDuration(spans),
				longTasks: tasks.length,
				maxLongTaskMs: Math.max(0, ...tasks.map((t) => t.duration)),
			};
		}
		const traceName = `${label}-${block}-${order}.trace.json.gz`,
			trace = gzipSync(JSON.stringify(sanitizeTrace({ traceEvents: events })));
		await writeFile(resolve(directory, traceName), trace, { mode: 0o600 });
		records.push({
			label,
			block,
			order,
			metrics,
			observed,
			trace: traceName,
			sha256: createHash('sha256').update(trace).digest('hex'),
		});
		await writeFile(
			resolve(directory, 'results.json'),
			JSON.stringify(
				{
					schemaVersion: 1,
					browser: browser.version(),
					cpu,
					viewport: { width, height: 900 },
					fixtureSha256: createHash('sha256').update(fixtureText).digest('hex'),
					baselineSource: args['revision-a'] ?? null,
					candidateSource: args['revision-b'] ?? null,
					cssExperimentSha256:
						args['css-b'] === undefined
							? null
							: createHash('sha256')
									.update(await readFile(args['css-b']))
									.digest('hex'),
					targets,
					records,
				},
				null,
				2,
			),
		);
		console.log(
			JSON.stringify({
				label,
				block,
				order,
				ms: metrics.whole.styleLayoutMs,
				tail: metrics.tail.styleLayoutMs,
				long: metrics.whole.longTasks,
				focus: observed.focusRestored,
				closed: observed.closed,
			}),
		);
	}
	for (const label of Object.keys(targets))
		for (let i = 0; i < Number(args.warmup ?? 2); i++) await run(label, -1, i, true);
	for (let block = 0; block < blocks; block++) {
		const sequence = args.b ? ['A', 'B', 'B', 'A'] : ['A'];
		for (let order = 0; order < sequence.length; order++) await run(sequence[order], block, order);
	}
} finally {
	for (const { cdp } of Object.values(pages))
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
	await browser.close();
}
