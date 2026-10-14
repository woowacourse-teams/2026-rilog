import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { prepareTheRilogSnapshot } from './prepare-the-rilog.mjs';

try {
	process.env.NODE_ENV ??= 'production';
	const { outputPath } = await prepareTheRilogSnapshot();
	const nextPath = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
	const child = spawn(process.execPath, [nextPath, 'build', ...process.argv.slice(2)], {
		stdio: 'inherit',
		env: { ...process.env, THE_RILOG_SNAPSHOT_PATH: outputPath },
	});
	process.exitCode = await new Promise((resolve, reject) => {
		child.once('error', reject);
		child.once('exit', (code, signal) => resolve(signal ? 1 : (code ?? 1)));
	});
} catch (error) {
	console.error(error instanceof Error ? error.message : 'The Rilog build failed.');
	process.exitCode = 1;
}
