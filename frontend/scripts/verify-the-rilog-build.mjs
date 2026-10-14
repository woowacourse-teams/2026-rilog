import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import './register-typescript.mjs';

const { parseTheRilogSnapshot } = await import('../src/features/the-rilog/server/the-rilog-snapshot.ts');

const buildDirectory = process.env.SENTRY_FEED_503_SMOKE === 'true' ? '.next-sentry-feed-503' : '.next';
const prerender = JSON.parse(await readFile(resolve(buildDirectory, 'prerender-manifest.json'), 'utf8'));
if (!prerender.routes?.['/the-rilog']) throw new Error('/the-rilog is not statically prerendered.');
if (prerender.routes['/the-rilog'].initialRevalidateSeconds !== false) {
	throw new Error('/the-rilog must use on-demand revalidation, not a time interval.');
}
const snapshot = parseTheRilogSnapshot(JSON.parse(await readFile('.the-rilog-build/snapshot.json', 'utf8')));
const html = await readFile(resolve(buildDirectory, 'server/app/the-rilog.html'), 'utf8');
if (!html.includes(`data-the-rilog-input="${snapshot.checksum}"`)) {
	throw new Error('The prerendered HTML was generated from a different snapshot.');
}
if (!html.includes(`data-the-rilog-captured-at="${snapshot.capturedAt}"`)) {
	throw new Error('The prerendered HTML does not identify its capture time.');
}
console.log('The Rilog prerendering and snapshot identity verified.');
