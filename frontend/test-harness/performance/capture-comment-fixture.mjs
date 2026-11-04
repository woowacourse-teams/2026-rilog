// Captures public GET responses only. Keep output outside the repository.
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const destination = process.argv[2];
if (!destination) throw new Error('Usage: node capture-comment-fixture.mjs <private-output-directory>');
const directory = resolve(destination);
await mkdir(directory, { recursive: true, mode: 0o700 });
const paths = [
	'/v1/blogs/jetproc/posts/246',
	'/v1/posts/246/comment-anchors',
	'/v1/posts/246/comment-anchors/sidebar',
	'/v1/blogs/jetproc',
	'/v1/posts/count',
	'/v1/blogs/jetproc/posts?page=0&size=30&chapterId=75',
];
const api = {};
for (const path of paths) {
	const url = new URL(path, 'https://api.rilog.kr');
	url.searchParams.sort();
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Public fixture capture failed: ${url.pathname} ${response.status}`);
	api[url.pathname + url.search] = { status: response.status, body: await response.text() };
}
const fixture = {
	schemaVersion: 1,
	capturedAt: new Date().toISOString(),
	source: 'https://www.rilog.kr/@jetproc/posts/246',
	api,
};
const text = JSON.stringify(fixture);
await writeFile(resolve(directory, 'fixture.json'), text, { mode: 0o600 });
console.log(
	JSON.stringify({
		file: resolve(directory, 'fixture.json'),
		sha256: createHash('sha256').update(text).digest('hex'),
		responses: paths.length,
	}),
);
