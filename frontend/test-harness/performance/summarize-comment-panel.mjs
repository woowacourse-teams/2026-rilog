import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const median = (values) => {
	const sorted = [...values].sort((a, b) => a - b),
		n = sorted.length;
	if (!n) throw new Error('Empty sample');
	return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
};
export function summarize(data) {
	const blocks = [...new Set(data.records.map((r) => r.block))].sort((a, b) => a - b);
	const paired = blocks.map((block) => {
		const rows = data.records.filter((r) => r.block === block);
		const a = rows.filter((r) => r.label === 'A'),
			b = rows.filter((r) => r.label === 'B');
		if (a.length !== 2 || b.length !== 2) throw new Error(`Incomplete ABBA block ${block}`);
		return { block, a: a.map((r) => r.metrics.whole.styleLayoutMs), b: b.map((r) => r.metrics.whole.styleLayoutMs) };
	});
	const a = paired.flatMap((b) => b.a),
		b = paired.flatMap((b) => b.b),
		am = median(a),
		bm = median(b);
	let seed = 872;
	const random = () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
	const differences = [];
	for (let i = 0; i < 10000; i++) {
		const sample = paired.map(() => paired[Math.floor(random() * paired.length)]);
		differences.push(median(sample.flatMap((x) => x.a)) - median(sample.flatMap((x) => x.b)));
	}
	differences.sort((a, b) => a - b);
	const ci = [differences[250], differences[9749]];
	const phase = {};
	for (const label of ['A', 'B']) {
		const rows = data.records.filter((r) => r.label === label);
		phase[label] = {
			samples: rows.length,
			openMs: median(rows.map((r) => r.metrics.open.styleLayoutMs)),
			closeMs: median(rows.map((r) => r.metrics.close.styleLayoutMs)),
			tailMs: median(rows.map((r) => r.metrics.tail.styleLayoutMs)),
			longTasks: rows.reduce((n, r) => n + r.metrics.whole.longTasks, 0),
			focusRestored: rows.filter((r) => r.observed.focusRestored).length,
			closed: rows.filter((r) => r.observed.closed).length,
		};
	}
	return {
		browser: data.browser,
		cpu: data.cpu,
		viewport: data.viewport,
		blocks: blocks.length,
		complete: blocks.length >= 10,
		fixtureSha256: data.fixtureSha256,
		baselineMedianMs: am,
		candidateMedianMs: bm,
		reductionMs: am - bm,
		reductionPercent: (100 * (am - bm)) / am,
		pairedBlockBootstrap95Ms: ci,
		meetsPrimaryTarget: blocks.length >= 10 && am - bm >= 10 && (am - bm) / am >= 0.2 && ci[0] > 0,
		phase,
	};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const result = summarize(JSON.parse(await readFile(process.argv[2], 'utf8')));
	if (process.argv[3]) await writeFile(process.argv[3], JSON.stringify(result, null, 2));
	console.log(JSON.stringify(result, null, 2));
}
