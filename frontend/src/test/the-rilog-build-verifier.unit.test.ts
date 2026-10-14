import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { createTheRilogFixtureSnapshot } from '@/test/fixtures/the-rilog';

const script = resolve('scripts/verify-the-rilog-build.mjs');
const snapshot = createTheRilogFixtureSnapshot();
let directory: string;

beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), 'the-rilog-verifier-'));
	await mkdir(join(directory, '.the-rilog-build'));
	await mkdir(join(directory, '.next/server/app'), { recursive: true });
	await writeFile(join(directory, '.the-rilog-build/snapshot.json'), JSON.stringify(snapshot));
});

afterEach(async () => {
	await rm(directory, { recursive: true, force: true });
});

const verify = () =>
	spawnSync(process.execPath, [script], {
		cwd: directory,
		encoding: 'utf8',
		env: { ...process.env, SENTRY_FEED_503_SMOKE: 'false' },
	});

async function writeOutput(routes: unknown, checksum = snapshot.checksum, capturedAt = snapshot.capturedAt) {
	await writeFile(join(directory, '.next/prerender-manifest.json'), JSON.stringify({ routes }));
	await writeFile(
		join(directory, '.next/server/app/the-rilog.html'),
		`<main data-the-rilog-input="${checksum}" data-the-rilog-captured-at="${capturedAt}"></main>`,
	);
}

it('정적 생성 설정과 입력 식별값을 확인하고 별도 산출물을 만들지 않는다', async () => {
	await writeOutput({ '/the-rilog': { initialRevalidateSeconds: false } });
	const result = verify();
	expect(result.status, result.stderr).toBe(0);
	expect(await readdir(join(directory, '.the-rilog-build'))).toEqual(['snapshot.json']);
});

it.each([
	{ routes: {}, message: 'not statically prerendered' },
	{ routes: { '/the-rilog': { initialRevalidateSeconds: 60 } }, message: 'on-demand revalidation' },
])('정적 생성 계약이 다르면 실패한다: $message', async ({ routes, message }) => {
	await writeOutput(routes);
	const result = verify();
	expect(result.status).toBe(1);
	expect(result.stderr).toContain(message);
});

it.each([
	{ checksum: 'different', capturedAt: snapshot.capturedAt, message: 'different snapshot' },
	{ checksum: snapshot.checksum, capturedAt: '2026-10-12T00:00:00Z', message: 'capture time' },
])('HTML 입력 식별값이 다르면 실패한다: $message', async ({ checksum, capturedAt, message }) => {
	await writeOutput({ '/the-rilog': { initialRevalidateSeconds: false } }, checksum, capturedAt);
	const result = verify();
	expect(result.status).toBe(1);
	expect(result.stderr).toContain(message);
});
