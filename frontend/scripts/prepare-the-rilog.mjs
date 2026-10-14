import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import './register-typescript.mjs';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const requireFromNext = createRequire(import.meta.resolve('next/package.json'));
requireFromNext('@next/env').loadEnvConfig(frontendRoot);

async function prepareSnapshotInput(outputPath) {
	const { captureTheRilogSnapshot, parseTheRilogSnapshot } =
		await import('../src/features/the-rilog/server/the-rilog-snapshot.ts');
	const inputPath = process.env.THE_RILOG_SNAPSHOT_PATH;
	const snapshot = inputPath
		? parseTheRilogSnapshot(JSON.parse(await readFile(resolve(frontendRoot, inputPath), 'utf8')))
		: await captureTheRilogSnapshot();
	if (snapshot.source === 'fixture' && process.env.THE_RILOG_ALLOW_FIXTURE !== 'true') {
		throw new Error('Fixture snapshots require THE_RILOG_ALLOW_FIXTURE=true and are not production inputs.');
	}
	const { writeTheRilogSnapshot } = await import('../src/features/the-rilog/server/the-rilog-snapshot-store.ts');
	await writeTheRilogSnapshot(snapshot, outputPath);
	console.log(`The Rilog input validated (${snapshot.source}, checksum ${snapshot.checksum}).`);
	return { snapshot, outputPath };
}

export async function prepareTheRilogSnapshot(outputPath = resolve(frontendRoot, '.the-rilog-build/snapshot.json')) {
	try {
		return await prepareSnapshotInput(outputPath);
	} catch (error) {
		try {
			const { initializeSentry } = await import('../src/shared/error-tracking/initialize-sentry.ts');
			const { apiErrorReporter } = await import('../src/shared/error-tracking/api-error-reporter-instance.ts');
			const { flushSentryEvents } = await import('../src/shared/error-tracking/sentry-error-tracker.ts');
			// This CLI runs before Next instrumentation. Reuse its privacy filters,
			// without adding a Slack callback, and finish pending delivery before exit.
			initializeSentry({ tracesSampleRate: 0 });
			apiErrorReporter.report(error, { operation: 'prepare the rilog snapshot' });
			await flushSentryEvents();
		} catch {
			console.error('Build error delivery failed; the original preparation failure is preserved.');
		}
		throw error;
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const args = process.argv.slice(2);
		if (args.length !== 0 && (args.length !== 2 || args[0] !== '--output' || !args[1])) {
			throw new Error('Usage: prepare-the-rilog.mjs [--output <snapshot path>]');
		}
		await prepareTheRilogSnapshot(args.length === 2 ? resolve(frontendRoot, args[1]) : undefined);
	} catch (error) {
		console.error(error instanceof Error ? error.message : 'The Rilog input preparation failed.');
		process.exitCode = 1;
	}
}
