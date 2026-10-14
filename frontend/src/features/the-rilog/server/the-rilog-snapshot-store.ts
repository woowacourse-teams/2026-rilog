import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { TheRilogSnapshot } from './the-rilog-snapshot';

import { parseTheRilogSnapshot } from './the-rilog-snapshot';

const snapshotPath = () => join(process.cwd(), '.the-rilog-build', 'snapshot.json');

export async function readTheRilogSnapshot() {
	const value: unknown = JSON.parse(await readFile(snapshotPath(), 'utf8'));
	return parseTheRilogSnapshot(value);
}

export async function writeTheRilogSnapshot(snapshot: TheRilogSnapshot, outputPath = snapshotPath()) {
	const validated = parseTheRilogSnapshot(snapshot);
	await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 });
	const temporaryPath = `${outputPath}.${randomUUID()}.tmp`;
	try {
		await writeFile(temporaryPath, `${JSON.stringify(validated)}\n`, { mode: 0o600 });
		await rename(temporaryPath, outputPath);
	} finally {
		await rm(temporaryPath, { force: true });
	}
}
