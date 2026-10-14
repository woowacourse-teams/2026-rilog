import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const frontendRoot = fileURLToPath(new URL('../', import.meta.url));

// Build tools reuse the application's TypeScript API modules without adding a runner.
// Node does not read tsconfig paths or resolve extensionless TypeScript imports.
registerHooks({
	resolve(specifier, context, nextResolve) {
		let target;
		if (specifier.startsWith('@/')) {
			target = resolve(frontendRoot, 'src', specifier.slice(2));
		} else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
			const parent = fileURLToPath(context.parentURL);
			const isApplicationModule = ['src/', 'scripts/', 'test-harness/'].some((directory) =>
				parent.startsWith(resolve(frontendRoot, directory) + '/'),
			);
			if (isApplicationModule) {
				target = resolve(dirname(parent), specifier);
			}
		}
		if (target) {
			for (const extension of ['', '.ts', '.tsx', '.mjs', '.js']) {
				if (existsSync(`${target}${extension}`) && !target.endsWith('/')) {
					return nextResolve(pathToFileURL(`${target}${extension}`).href, context);
				}
			}
		}
		return nextResolve(specifier, context);
	},
});
