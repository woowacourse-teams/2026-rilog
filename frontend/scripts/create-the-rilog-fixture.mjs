import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import './register-typescript.mjs';

const { createTheRilogFixtureSnapshot } = await import('../src/test/fixtures/the-rilog.ts');

const directory = new URL('../.the-rilog-build/', import.meta.url);
await mkdir(directory, { recursive: true });
const destination = new URL('fixture.json', directory);
await writeFile(destination, `${JSON.stringify(createTheRilogFixtureSnapshot())}\n`, { mode: 0o600 });
console.log(`Test input created: ${fileURLToPath(destination)}`);
