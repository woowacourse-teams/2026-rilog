import { mkdir, open, stat, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

async function exists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
		throw error;
	}
}

/** Completed events survive process restarts; in-flight claims prevent concurrent delivery. */
export async function deliverSentryWebhookOnce(
	directory: string,
	key: string,
	deliver: () => Promise<boolean>,
): Promise<'delivered' | 'duplicate' | 'busy' | 'failed'> {
	if (!isAbsolute(directory) || !/^[1-9]\d*-[a-f\d]{32}$/.test(key))
		throw new Error('Invalid webhook state configuration.');
	await mkdir(directory, { recursive: true, mode: 0o700 });
	const completed = join(directory, `${key}.delivered`);
	const pending = join(directory, `${key}.pending`);
	if (await exists(completed)) return 'duplicate';
	try {
		const claim = await open(pending, 'wx', 0o600);
		await claim.close();
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
			return (await exists(completed)) ? 'duplicate' : 'busy';
		}
		throw error;
	}
	try {
		if (await exists(completed)) return 'duplicate';
		if (!(await deliver())) return 'failed';
		await writeFile(completed, '', { flag: 'wx', mode: 0o600 });
		return 'delivered';
	} finally {
		await unlink(pending);
	}
}
