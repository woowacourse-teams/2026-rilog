// Measurement server only; explicitly imported by node, never by the app.
import { readFile } from 'node:fs/promises';

if (!process.env.COMMENT_PERF_FIXTURE) throw new Error('COMMENT_PERF_FIXTURE must point to a captured fixture');
const fixture = JSON.parse(await readFile(process.env.COMMENT_PERF_FIXTURE, 'utf8'));
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
	const url = new URL(input instanceof Request ? input.url : String(input));
	if (url.origin !== 'https://api.rilog.test') return originalFetch(input, init);
	const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
	if (method !== 'GET') throw new Error('Measurement server cannot write to the API');
	url.searchParams.sort();
	const item = fixture.api[url.pathname + url.search];
	if (!item) return Response.json({ status: 404, message: 'No public fixture', data: null }, { status: 404 });
	return new Response(item.body, { status: item.status, headers: { 'Content-Type': 'application/json' } });
};
